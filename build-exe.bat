@echo off
chcp 65001 >nul
title Noditos - Generador de Noditos.exe (Node SEA)
cd /d "%~dp0"
setlocal EnableDelayedExpansion

rem ==========================================
rem   NODITOS - Generador de ejecutable (Node SEA)
rem   Todo se baja del registro npm: nada de GitHub releases.
rem   Requisitos: Node.js 20.12+ instalado y npm.
rem ==========================================

set "NODE_VERSION=22.23.2"
set "CACHE=%LOCALAPPDATA%\noditos-sea"
set "STAGE=%TEMP%\noditos-sea-stage"

echo.
echo   ==========================================
echo     NODITOS - Generador de ejecutable (SEA)
echo     Destino: Windows x64 - Node %NODE_VERSION%
echo   ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo   [ERROR] Node.js no esta en el PATH. Instalalo desde https://nodejs.org
  pause
  exit /b 1
)

echo   [1/7] Instalando dependencias del proyecto (si hace falta)...
if not exist "node_modules\postject" (
  call npm ci --no-audit --no-fund
  if errorlevel 1 goto error
)
echo.

echo   [2/7] Compilando la aplicacion web (dist/)...
call npx vite build
if errorlevel 1 goto error
echo.

echo   [3/7] Generando build-info.json (version y fecha quedan incrustadas)...
for /f %%V in ('node -p "require('./package.json').version || '0.0.0'"') do set "VERSION=%%V"
for /f %%D in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "BUILT_AT=%%D"
set "COMMIT=sin-git"
for /f %%C in ('git rev-parse --short HEAD 2^>nul') do set "COMMIT=%%C"
if exist "%STAGE%" rmdir /s /q "%STAGE%"
mkdir "%STAGE%"
> "%STAGE%\build-info.json" (
  echo {
  echo   "version": "%VERSION%",
  echo   "builtAt": "%BUILT_AT%",
  echo   "commit": "%COMMIT%"
  echo }
)
echo         Noditos v%VERSION% - build %BUILT_AT% - commit %COMMIT%
echo.

echo   [4/7] Obteniendo Node %NODE_VERSION% desde npm (cache: %CACHE%)...
if exist "%CACHE%\node-win-x64\bin\node.exe" (
  echo         ya esta en cache
) else (
  if not exist "%CACHE%" mkdir "%CACHE%"
  pushd "%CACHE%"
  call npm pack node-win-x64@%NODE_VERSION% --silent
  if errorlevel 1 ( popd & goto error )
  if exist node-win-x64 rmdir /s /q node-win-x64
  mkdir node-win-x64-tmp
  tar -xzf node-win-x64-%NODE_VERSION%.tgz -C node-win-x64-tmp
  move node-win-x64-tmp\package node-win-x64 >nul
  rmdir /s /q node-win-x64-tmp
  del /f /q node-win-x64-%NODE_VERSION%.tgz
  popd
)
echo.

echo   [5/7] Preparando el paquete y generando el blob SEA...
copy /y server.cjs "%STAGE%\" >nul
xcopy /e /i /q /y dist "%STAGE%\dist" >nul
call node tools\make-sea-config.cjs "%STAGE%"
if errorlevel 1 goto error
rem El blob lo genera EL MISMO node.exe que sera la base: version perfecta.
pushd "%STAGE%"
call "%CACHE%\node-win-x64\bin\node.exe" --experimental-sea-config sea-config.json
if errorlevel 1 ( popd & goto error )
popd
echo.

echo   [6/7] Copiando base y limpiando la firma Authenticode...
if not exist release mkdir release
if exist release\Noditos.exe (
  taskkill /F /IM Noditos.exe >nul 2>&1
  timeout /t 1 /nobreak >nul 2>&1
  del /f /q release\Noditos.exe >nul 2>&1
  if exist release\Noditos.exe (
    echo.
    echo   [ERROR] release\Noditos.exe esta bloqueado. Cerralo desde el
    echo   Administrador de tareas (Ctrl+Shift+Esc) y vuelve a ejecutar.
    pause
    exit /b 1
  )
)
copy /y "%CACHE%\node-win-x64\bin\node.exe" release\Noditos.exe >nul
call node tools\pe-signature.cjs release\Noditos.exe --strip
if errorlevel 1 goto error
echo.

echo   [7/7] Inyectando el blob en el ejecutable (postject)...
call npx --yes postject@1.0.0-alpha.6 release\Noditos.exe NODE_SEA_BLOB "%STAGE%\sea-prep.blob" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite
if errorlevel 1 goto error
echo.

echo   Verificando...
call node tools\pe-signature.cjs release\Noditos.exe | findstr /C:"sin firma Authenticode" >nul
if errorlevel 1 (
  echo   [ERROR] La firma vieja no quedo limpia.
  goto error
)
findstr /m /C:"%COMMIT%" release\Noditos.exe >nul
if errorlevel 1 (
  echo   [ERROR] build-info.json no quedo incrustado.
  goto error
)
for %%F in (release\Noditos.exe) do set "EXESIZE=%%~zF"
if !EXESIZE! LSS 40000000 (
  echo   [ERROR] Ejecutable sospechosamente chico: !EXESIZE! bytes.
  goto error
)
for /f "skip=1 tokens=*" %%H in ('powershell -NoProfile -Command "Get-FileHash release\Noditos.exe -Algorithm SHA256 ^| Select-Object -ExpandProperty Hash"') do set "SHA=%%H"

if exist "%STAGE%" rmdir /s /q "%STAGE%"

echo.
echo   ==========================================
echo     LISTO! release\Noditos.exe
echo     Tamano: !EXESIZE! bytes
echo     SHA256: !SHA!
echo     Doble clic y la app se abre en el navegador.
echo   ==========================================
echo.
pause
exit /b 0

:error
if exist "%STAGE%" rmdir /s /q "%STAGE%"
echo.
echo   [ERROR] El proceso fallo. Revisa los mensajes de arriba.
echo   Causas comunes: sin internet (npm) o Node.js desactualizado.
pause
exit /b 1
