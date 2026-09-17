import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends (Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 max-w-xl mx-auto bg-white rounded-3xl border border-rose-150 shadow-md text-right font-sans" dir="rtl">
          <div className="flex items-center gap-3 border-b border-rose-100 pb-4 mb-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {this.props.fallbackTitle || "حدث خطأ غير متوقع أثناء عرض هذا القسم"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تم احتواء الخطأ البرمجي بنجاح لمنع تعطل النظام. يمكنك إعادة المحاولة بالضغط أدناه.
              </p>
            </div>
          </div>

          {this.state.error?.message && (
            <div className="p-3 bg-slate-50 text-slate-700 text-xs font-mono rounded-xl border border-slate-200 mb-4 overflow-x-auto text-left" dir="ltr">
              {this.state.error.message}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all"
            >
              تحديث الصفحة
            </button>
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة محاولة فتح القسم</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
