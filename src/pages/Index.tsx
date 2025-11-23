import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground">
            Lead Portal
          </h1>
          <p className="text-xl text-muted-foreground">
            Access your enriched recruitment leads in one secure, professional portal
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/client/dashboard")}>
              Client Portal
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Building2 className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Company Intelligence</CardTitle>
              <CardDescription>
                Detailed company information including size, industry, and contact details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get comprehensive insights about potential clients with enriched data
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Contact Management</CardTitle>
              <CardDescription>
                Direct access to decision makers with verified contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Email, phone, LinkedIn profiles, and more for each lead
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Real-time Updates</CardTitle>
              <CardDescription>
                Stay informed with live status tracking and call notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track lead progress from initial contact to booking
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
