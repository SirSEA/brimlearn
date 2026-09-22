import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CloudOff, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";

export default function ServiceUnavailable() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100/70">
      <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-100 rounded-full animate-pulse" />
              <CloudOff className="relative h-16 w-16 text-amber-500" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-slate-900 mb-2">503</h1>

          <h2 className="text-xl font-semibold text-slate-700 mb-4">
            Service Unavailable
          </h2>

          <p className="text-slate-600 mb-8 leading-relaxed">
            BrimLearn is briefly offline for maintenance.
            <br />
            Lessons, practice, and live classes will be back shortly.
          </p>

          <div
            id="service-unavailable-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={() => window.location.reload()}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry now
            </Button>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="px-6 py-2.5 rounded-lg transition-all duration-200"
            >
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}