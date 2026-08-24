@echo off
chcp 65001 >nul
title Noditos - Generador de Noditos.exe
cd /d "%~dp0"
set "PROJ=%cd%\"
set "STAGE=%TEMP%\noditos-exe-stage"

echo.
echo  ==========================================
echo    NODITOS - Generador de ejecutable (.exe)
echo  ==========================================
echo.

echo  [1/4] Instalando dependencias del proyecto...
call npm install
if errorlevel 1 goto error
:: npm 11+ puede bloquear el postinstall de esbuild; lo forzamos por si acaso.
call npm rebuild esbuild >nul 2>&1
echo.

echo  [2/4] Compilando la aplicacion web (dist/)...
call npx vite build
if errorlevel 1 goto error
echo.

echo  [3/4] Preparando carpeta de empaquetado limpia...
:: Se empaqueta desde una ruta sin espacios ni parentesis: pkg usa globs
:: y ciertos caracteres en la ruta rompen la incrustacion de dist/.
if exist "%STAGE%" rmdir /s /q "%STAGE%"
mkdir "%STAGE%"
xcopy /e /i /q /y "%PROJ%dist" "%STAGE%\dist" >nul
copy /y "%PROJ%server.cjs" "%STAGE%\" >nul
copy /y "%PROJ%pkg.json" "%STAGE%\" >nul
cd /d "%STAGE%"
echo        Lista en: %STAGE%
echo.

echo  [4/4] Empaquetando Noditos.exe...
if not "%~1"=="" (
  echo        Usando la version de Node indicada: %~1
  set "TRY_VERSIONS=%~1"
) else (
  echo        Consultando a GitHub los binarios disponibles...
  set "TRY_VERSIONS="
  for /f "delims=" %%L in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJ%discover-binary.ps1" -Platform win 2^>nul') do set "TRY_VERSIONS=%%L"
)

if defined TRY_VERSIONS (
  echo        Versiones a probar: %TRY_VERSIONS%
) else (
  echo        Sin acceso a la lista oficial; probando versiones conocidas...
  set "TRY_VERSIONS=20.20.1 20.20.0 20.19.4 18.20.8"
)
echo.

set "SUCCESS="
for %%V in (%TRY_VERSIONS%) do call :try_pkg %%V

if defined SUCCESS goto success
goto allfailed

:try_pkg
echo   Probando con el binario node%1-win-x64...
node "%PROJ%node_modules\@yao-pkg\pkg\lib-es5\bin.js" server.cjs --targets node%1-win-x64 --config pkg.json --output "%PROJ%release\Noditos.exe"
if not errorlevel 1 set "SUCCESS=%1"
exit /b 0

:success
cd /d "%PROJ%"
if exist "%STAGE%" rmdir /s /q "%STAGE%"
set "EXESIZE="
for %%F in ("%PROJ%release\Noditos.exe") do set "EXESIZE=%%~zF"
echo.
echo  ==========================================
echo    LISTO! Empaquetado con Node %SUCCESS%
echo    Tu ejecutable esta en:
echo.
echo      %PROJ%release\Noditos.exe
echo    Tamano: %EXESIZE% bytes
if %EXESIZE% LSS 20000000 echo    AVISO: menos de 20 MB; dist/ podria no haberse incrustado. Revisa los mensajes de pkg arriba.
echo.
echo    Doble clic en Noditos.exe y la app se
echo    abrira sola en el navegador.
echo.
echo    Si Windows dice "Aplicacion desconocida":
echo    clic derecho en Noditos.exe, Propiedades,
echo    y marca "Desbloquear".
echo  ==========================================
echo.
pause
exit /b 0

:allfailed
cd /d "%PROJ%"
if exist "%STAGE%" rmdir /s /q "%STAGE%"
echo.
echo  [ERROR] Ningun binario base funciono.
echo.
echo  Solucion manual en 30 segundos:
echo    1. Abri https://github.com/yao-pkg/pkg-fetch/releases
echo    2. Busca un asset llamado node-vX.Y.Z-win-x64
echo    3. Volve a ejecutar indicando esa version:
echo.
echo         build-exe.bat X.Y.Z
echo.
pause
exit /b 1

:error
cd /d "%PROJ%"
echo.
echo  [ERROR] El proceso fallo. Revisa los mensajes de arriba.
echo  Causas comunes: sin conexion a internet o Node.js no instalado.
echo.
pause
exit /b 1
