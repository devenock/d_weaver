import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, Download, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const navigate = useNavigate();
  const [_user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      // Redirect authenticated users to dashboard
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const features = [
    {
      icon: Zap,
      title: "Dead Simple",
      description:
        "No clutter, no learning curve. Everything you need is right where you expect it. Start diagramming in seconds, not hours.",
    },
    {
      icon: Users,
      title: "Effortless Collaboration",
      description:
        "Invite your team with one click. Edit together in real-time. No complex permissions or confusing sharing settings.",
    },
    {
      icon: Sparkles,
      title: "AI That Just Works",
      description:
        "Describe what you need in plain English. Get a professional diagram instantly. It's that simple.",
    },
    {
      icon: Download,
      title: "Export Anywhere",
      description:
        "One click to SVG, PNG, or embed code. No watermarks, no restrictions. Your diagrams, your way.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <div className="inline-block">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Zap className="w-4 h-4" />
              Simple. Collaborative. Powerful.
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Architecture diagrams,{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              without the complexity.
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Finally, a diagramming tool that gets out of your way. Create system
            designs, collaborate with your team, and ship faster—no manual
            required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg px-8 gap-2"
              onClick={() => navigate("/editor")}
            >
              <Zap className="w-5 h-5" />
              Start Designing Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8"
              onClick={() => navigate("/gallery")}
            >
              View Templates
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Why Teams Choose Us Over Lucidchart
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We stripped away the bloat. What's left is a tool that just works.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Stop Fighting Your Tools
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Your next architecture diagram is 30 seconds away
          </p>
          <Button
            size="lg"
            className="text-lg px-8 gap-2"
            onClick={() => navigate("/editor")}
          >
            <Zap className="w-5 h-5" />
            Try It Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              ArchitectHub
            </div>
            <p className="text-muted-foreground">
              &copy; 2024 ArchitectHub. Built for engineers, by engineers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
