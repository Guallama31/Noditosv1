import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Se invoca con el error para renderizar una UI de recuperación. */
  fallback?: (error: Error) => ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
}

/**
 * Límite de errores: si un hijo falla al renderizar, muestra el fallback en
 * lugar de dejar la pantalla en negro.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
    // eslint-disable-next-line no-console
    console.error("[Noditos] error de renderizado:", error);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ? this.props.fallback(this.state.error) : null;
    }
    return this.props.children;
  }
}
