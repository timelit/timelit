import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollText } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/timelit-logo.png" alt="Timelit Logo" className="w-12 h-12 rounded-xl shadow-lg" />
            <h1 className="text-3xl font-bold text-foreground">Timelit</h1>
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Terms of Service</h2>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ScrollText className="w-5 h-5 text-primary" />
              Terms and Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-foreground">
            <section>
              <h3 className="text-lg font-semibold mb-3">1. Agreement to Terms</h3>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using Timelit ("Service"), you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">2. Description of Service</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Timelit is a smart calendar and task management application that helps you organize your schedule, manage tasks, and integrate with Google Calendar. Our service includes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Task creation and management</li>
                <li>Calendar event scheduling</li>
                <li>Google Calendar integration</li>
                <li>AI-powered scheduling assistance</li>
                <li>Notification and reminder services</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">3. User Accounts and Registration</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                To use Timelit, you must create an account using Google OAuth authentication. You agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">4. Google Calendar Integration</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                When you connect your Google Calendar to Timelit:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>We access your calendar events for display and synchronization purposes only</li>
                <li>We do not modify, delete, or create events in your Google Calendar without your explicit action</li>
                <li>You can disconnect your Google Calendar at any time</li>
                <li>We use Google's official APIs and comply with their terms of service</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">5. Acceptable Use</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">You agree not to use Timelit to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Transmit any harmful, threatening, or offensive content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with other users' use of the service</li>
                <li>Use the service for commercial purposes without authorization</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">6. Data and Privacy</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, 
                to understand our practices regarding the collection, use, and disclosure of your information.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">7. Service Availability</h3>
              <p className="text-muted-foreground leading-relaxed">
                While we strive to provide reliable service, Timelit is provided "as is" without warranty of any kind. 
                We do not guarantee that the service will be available 24/7 or free from interruptions, errors, or security vulnerabilities.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">8. Limitation of Liability</h3>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, Timelit shall not be liable for any indirect, incidental, special, 
                consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">9. Termination</h3>
              <p className="text-muted-foreground leading-relaxed">
                You may terminate your account at any time by discontinuing use of the service. 
                We may terminate or suspend your account immediately if you breach these terms.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">10. Changes to Terms</h3>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify users of significant changes. 
                Your continued use of Timelit after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">11. Contact Information</h3>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us through the application or via our support channels.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}