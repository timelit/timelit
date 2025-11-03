import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield, Calendar, Lock, Eye, Trash2 } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/timelit-logo.png" alt="Timelit Logo" className="w-12 h-12 rounded-xl shadow-lg" />
            <h1 className="text-3xl font-bold text-foreground">Timelit</h1>
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Privacy Policy</h2>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Shield className="w-5 h-5 text-primary" />
              Privacy Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-foreground">
            <section>
              <h3 className="text-lg font-semibold mb-3">1. Introduction</h3>
              <p className="text-muted-foreground leading-relaxed">
                At Timelit, we respect your privacy and are committed to protecting your personal data. This privacy policy 
                explains how we collect, use, store, and protect your information when you use our smart calendar and task management service.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                2. Information We Collect
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Account Information</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Name and email address (from Google OAuth)</li>
                    <li>Profile information from your Google account</li>
                    <li>User preferences and settings</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Calendar and Task Data</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Tasks you create, including titles, descriptions, due dates, and priorities</li>
                    <li>Events you create within Timelit</li>
                    <li>Calendar events from your Google Calendar (when connected)</li>
                    <li>Scheduling preferences and notification settings</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Usage Information</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Log data and usage statistics</li>
                    <li>Feature usage and interaction patterns</li>
                    <li>Error reports and performance data</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                3. Google Calendar Integration
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                When you choose to connect your Google Calendar to Timelit:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Read Access Only:</strong> We only read your calendar events to display them alongside your Timelit tasks</li>
                <li><strong>No Modifications:</strong> We do not create, edit, or delete events in your Google Calendar without your explicit action</li>
                <li><strong>Secure Storage:</strong> Calendar data is securely stored and encrypted</li>
                <li><strong>Real-time Sync:</strong> We use Google's push notifications to keep your calendar up-to-date</li>
                <li><strong>Limited Scope:</strong> We only request the minimum necessary permissions</li>
                <li><strong>Revocable Access:</strong> You can disconnect your Google Calendar at any time</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">4. How We Use Your Information</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">We use your information to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide and maintain the Timelit service</li>
                <li>Sync and display your calendar events and tasks</li>
                <li>Send you notifications and reminders based on your preferences</li>
                <li>Provide AI-powered scheduling suggestions</li>
                <li>Improve our service through analytics and usage patterns</li>
                <li>Respond to your support requests</li>
                <li>Ensure security and prevent fraud</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                5. Data Security and Storage
              </h3>
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your data:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>All data is encrypted in transit and at rest</li>
                  <li>Access to your data is restricted to authorized personnel only</li>
                  <li>We use secure, industry-standard cloud infrastructure</li>
                  <li>Regular security audits and updates</li>
                  <li>OAuth tokens are securely stored and regularly rotated</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">6. Data Sharing and Disclosure</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share specific information</li>
                <li><strong>Service Providers:</strong> With trusted third-party services that help us operate Timelit (under strict confidentiality agreements)</li>
                <li><strong>Legal Requirements:</strong> If required by law or to protect our rights and the safety of our users</li>
                <li><strong>Google Services:</strong> Only the necessary data to maintain your Google Calendar integration</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">7. Your Rights and Choices</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">You have the right to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Access:</strong> Request copies of your personal data</li>
                <li><strong>Correction:</strong> Update or correct your information</li>
                <li><strong>Deletion:</strong> Request deletion of your data and account</li>
                <li><strong>Portability:</strong> Export your data in a common format</li>
                <li><strong>Restriction:</strong> Limit how we process your data</li>
                <li><strong>Withdrawal:</strong> Revoke consent for data processing</li>
                <li><strong>Google Calendar:</strong> Disconnect your Google Calendar integration at any time</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-primary" />
                8. Data Retention
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We retain your data only as long as necessary to provide our services:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Account data: Until you delete your account</li>
                <li>Tasks and events: Until you delete them or your account</li>
                <li>Google Calendar data: Only while your integration is active</li>
                <li>Usage logs: Up to 12 months for security and improvement purposes</li>
                <li>When you delete your account, we will delete all your personal data within 30 days</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">9. Cookies and Tracking</h3>
              <p className="text-muted-foreground leading-relaxed">
                Timelit uses minimal cookies and local storage to maintain your session and remember your preferences. 
                We do not use advertising cookies or track you across other websites. Essential cookies are required for the service to function properly.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">10. Children's Privacy</h3>
              <p className="text-muted-foreground leading-relaxed">
                Timelit is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. 
                If we become aware that a child under 13 has provided us with personal information, we will delete such information promptly.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">11. International Data Transfers</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your data may be processed and stored in countries other than your own. We ensure that such transfers comply with applicable 
                data protection laws and implement appropriate safeguards to protect your information.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">12. Changes to This Privacy Policy</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page 
                and updating the "Last updated" date. Your continued use of Timelit after such changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-semibold mb-3">13. Contact Us</h3>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy, your data rights, or our privacy practices, please contact us through 
                the application or our support channels. We will respond to your inquiry within 30 days.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}