import { ReactNode, Component, ErrorInfo } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch React component errors
 * Prevents entire app from crashing and provides recovery options
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('Error caught by boundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // You could also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 border-destructive/20 bg-destructive/5">
            <div className="space-y-6">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="rounded-full bg-destructive/10 p-4">
                  <AlertTriangle className="h-12 w-12 text-destructive animate-bounce" />
                </div>
              </div>

              {/* Error Message */}
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold text-foreground">
                  Oops! Something went wrong
                </h1>
                <p className="text-sm text-muted-foreground">
                  We encountered an unexpected error. Please try again or contact support if the problem persists.
                </p>
              </div>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="space-y-3 rounded-lg bg-secondary/50 p-4 font-mono text-xs overflow-auto max-h-40">
                  <div>
                    <span className="font-bold text-destructive">Error:</span>
                    <p className="text-muted-foreground break-words">
                      {this.state.error.toString()}
                    </p>
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <span className="font-bold text-muted-foreground">Component Stack:</span>
                      <pre className="text-muted-foreground whitespace-pre-wrap break-words">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={this.handleReset}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  size="lg"
                >
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Go Home
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-center text-muted-foreground">
                If this error continues, please{' '}
                <a
                  href="mailto:support@aide.app"
                  className="underline text-primary hover:text-primary/80 transition-colors"
                >
                  contact support
                </a>
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children || this.props.fallback;
  }
}

export default ErrorBoundary;
