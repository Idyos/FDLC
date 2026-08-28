import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render-time errors anywhere below it and shows a recoverable
 *  screen instead of the blank page React leaves behind by default (React
 *  unmounts the whole tree on an uncaught render error unless something
 *  catches it — there's no boundary anywhere else in this app, so any bug
 *  like stepBasicInfo's Invalid Date crash took the entire page down).
 *  Error boundaries only catch render/lifecycle errors, not ones from event
 *  handlers, effects, or async code — those still need their own handling. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold">S'ha produït un error inesperat.</p>
          <p className="text-sm text-muted-foreground max-w-md">
            La pàgina no s'ha pogut mostrar correctament. Prova a recarregar-la; si el problema
            continua, contacta amb l'administrador.
          </p>
          <Button onClick={() => window.location.reload()}>Recarregar la pàgina</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
