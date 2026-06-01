import { Outlet, Link, createRootRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/query-client";
import { useEffect, useRef } from "react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold tracking-tight text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

function AuthGuard() {
  const { session, isLoading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isInviteRoute = pathname.startsWith('/invite/');
  const isVerifyEmailRoute = pathname.startsWith('/verify-email');
  const isPublicRoute = isAuthRoute || isInviteRoute || isVerifyEmailRoute;

  useEffect(() => {
    if (isLoading || hasRedirected.current) return;

    if (!session && !isPublicRoute) {
      hasRedirected.current = true;
      navigate({ to: '/login', search: { redirect: undefined }, replace: true });
    } else if (session && isAuthRoute) {
      hasRedirected.current = true;
      navigate({ to: '/', replace: true });
    }
  }, [session, isLoading, isAuthRoute, isPublicRoute, navigate]);

  // Reset redirect flag when pathname actually changes
  useEffect(() => {
    hasRedirected.current = false;
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando EconomyZee...</p>
      </div>
    );
  }

  if (isPublicRoute) {
    return <Outlet />;
  }

  if (!session) {
    return null;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGuard />
      </AuthProvider>
    </QueryClientProvider>
  );
}
