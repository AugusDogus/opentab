import { ThemeToggle } from "~/app/components/ui/theme";

import Footer from "~/app/components/home/footer";
import Header from "~/app/components/home/header";
import { URLS } from "~/lib/urls";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-6 pb-20 pt-32">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>
          <div className="space-y-6 font-mono text-sm leading-relaxed">
            <p className="text-muted-foreground">Last Updated: January 2, 2026</p>

            <section>
              <h2 className="mb-3 text-xl font-semibold">1. Introduction</h2>
              <p>
                OpenTab is committed to protecting your privacy. This Privacy Policy explains how we
                collect, use, disclose, and safeguard your information when you use our tab sharing
                service. We have designed our service to minimize data collection and maximize user
                privacy.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">2. Information We Collect</h2>

              <h3 className="mb-2 mt-4 text-lg font-semibold">2.1 Authentication Data</h3>
              <p className="mb-3">
                When you sign in to OpenTab using a third-party provider (Google, Apple, or GitHub),
                we collect the following information:
              </p>
              <ul className="ml-6 list-outside list-disc space-y-2">
                <li>Username or display name</li>
                <li>User ID</li>
                <li>Email address (if provided)</li>
                <li>Profile picture (if provided)</li>
              </ul>

              <h3 className="mb-2 mt-4 text-lg font-semibold">2.2 Device Information</h3>
              <p className="mb-3">
                We collect information about your devices to enable tab sharing functionality:
              </p>
              <ul className="ml-6 list-outside list-disc space-y-2">
                <li>Device type and model</li>
                <li>Operating system and version</li>
                <li>Unique device identifiers for push notifications</li>
              </ul>

              <h3 className="mb-2 mt-4 text-lg font-semibold">2.3 Tab Data</h3>
              <p>
                When you send a tab through OpenTab, we temporarily process the URL and page title
                to deliver it to your mobile device. This data is not stored permanently on our
                servers and is only used for the purpose of delivering the tab to your device.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">3. How We Use Your Information</h2>
              <p className="mb-3">We use the information we collect to:</p>
              <ul className="ml-6 list-outside list-disc space-y-2">
                <li>Provide, maintain, and improve the OpenTab service</li>
                <li>Authenticate your identity and manage your account</li>
                <li>Deliver tabs to your registered devices</li>
                <li>Send push notifications when tabs are shared</li>
                <li>Detect, prevent, and address technical issues and security threats</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">4. Data Storage and Deletion</h2>
              <p className="mb-3">OpenTab is built with privacy as a core principle:</p>

              <h3 className="mb-2 mt-4 text-lg font-semibold">4.1 Tab Data</h3>
              <p>
                Tab URLs and titles are processed in real-time and delivered to your devices via
                push notifications. We do not maintain a permanent history of shared tabs on our
                servers.
              </p>

              <h3 className="mb-2 mt-4 text-lg font-semibold">4.2 Account Data</h3>
              <p>
                Your account information is stored for as long as your account is active. You can
                delete your account at any time, which will permanently delete all information we
                have stored about you.
              </p>
            </section>

            <section id="delete-account">
              <h2 className="mb-3 text-xl font-semibold">5. Account Deletion</h2>
              <p className="mb-3">
                You can delete your OpenTab account at any time directly from within the app:
              </p>
              <ol className="ml-6 list-outside list-decimal space-y-2 mb-4">
                <li>Open the OpenTab app on your mobile device or browser extension</li>
                <li>Tap the Settings icon (gear icon)</li>
                <li>Select &quot;Delete Account&quot;</li>
                <li>Confirm the deletion when prompted</li>
              </ol>
              <p className="mb-3">
                When you delete your account, the following data is permanently and immediately
                removed from our servers:
              </p>
              <ul className="ml-6 list-outside list-disc space-y-2 mb-4">
                <li>Your account information (name, email, profile picture)</li>
                <li>All registered devices and their push notification tokens</li>
                <li>Any pending tabs that have not yet been delivered</li>
                <li>Authentication sessions and tokens</li>
              </ul>
              <p>
                Account deletion is immediate and irreversible. There is no retention period — all
                data is deleted at the time of your request.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">6. Third-Party Services</h2>
              <p className="mb-3">
                OpenTab uses third-party services for authentication (Google, Apple, GitHub) and
                push notifications. When you use these services, you are subject to their respective
                privacy policies. We do not share your information with any other third parties
                except as necessary to provide the service or as required by law.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">7. Children&apos;s Privacy</h2>
              <p>
                OpenTab is intended for users who are at least 13 years of age. We do not knowingly
                collect personal information from children under 13. If we become aware that a user
                is under 13, we will terminate their account and delete their information.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">8. Data Security</h2>
              <p>
                We implement appropriate technical and organizational security measures to protect
                your information against unauthorized access, alteration, disclosure, or
                destruction. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">9. Your Rights</h2>
              <p className="mb-3">
                Depending on your location, you may have certain rights regarding your personal
                information, including:
              </p>
              <ul className="ml-6 list-outside list-disc space-y-2">
                <li>The right to access the personal information we hold about you</li>
                <li>The right to request correction of inaccurate information</li>
                <li>The right to request deletion of your personal information</li>
                <li>The right to object to or restrict certain processing of your information</li>
              </ul>
              <p className="mt-3">
                You can exercise your right to deletion at any time by deleting your account through
                the app settings.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">10. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any
                material changes by posting the new Privacy Policy on this page and updating the
                &quot;Last Updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">11. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy or our data practices, please
                open an issue on our{" "}
                <a
                  href={URLS.GITHUB}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  GitHub repository
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
      <div className="fixed bottom-4 right-4 z-50">
        <ThemeToggle />
      </div>
    </div>
  );
}
