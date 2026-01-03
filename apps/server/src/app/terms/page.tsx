import { ThemeToggle } from "~/app/components/ui/theme";

import Footer from "~/app/components/home/footer";
import Header from "~/app/components/home/header";
import { URLS } from "~/lib/urls";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-6 pb-20 pt-32">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>
          <div className="space-y-6 font-mono text-sm leading-relaxed">
            <p className="text-muted-foreground">Last Updated: January 2, 2026</p>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using OpenTab, you agree to be bound by these
                Terms of Service. If you do not agree to these terms, you may
                not use the service. OpenTab reserves the right to modify these
                terms at any time, and your continued use of the service
                constitutes acceptance of any changes.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">2. Eligibility</h2>
              <p>
                You must be at least 13 years of age to use OpenTab. By using
                the service, you represent and warrant that you meet this age
                requirement. If you are under 18, you represent that you have
                your parent or guardian&apos;s permission to use OpenTab. Users
                under 13 are strictly prohibited from using the service.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                3. Account and Authentication
              </h2>
              <p>
                OpenTab uses third-party authentication providers (Google,
                Apple, GitHub) for sign-in. By signing in, you authorize us to
                access and collect certain information from your account,
                including your username, user ID, email address, and profile
                picture. You are responsible for maintaining the security of
                your account and for all activities that occur under your
                account. You agree to notify us immediately of any unauthorized
                use of your account.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                4. Service Description
              </h2>
              <p>
                OpenTab is a tab sharing service that allows users to send
                browser tabs from their desktop browser to their mobile devices
                instantly. The service includes a browser extension and mobile
                applications that work together to provide seamless tab
                sharing functionality.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                5. User Content and Conduct
              </h2>
              <p className="mb-3">
                You are solely responsible for the URLs and content you share
                through OpenTab. You agree not to use OpenTab to share links to
                content that:
              </p>
              <ul className="ml-6 list-outside list-disc space-y-2">
                <li>
                  Is illegal, harmful, threatening, abusive, harassing,
                  defamatory, vulgar, obscene, or otherwise objectionable
                </li>
                <li>
                  Violates any local, state, national, or international law or
                  regulation
                </li>
                <li>
                  Infringes any patent, trademark, trade secret, copyright, or
                  other proprietary rights of any party
                </li>
                <li>Contains unsolicited or unauthorized advertising or spam</li>
                <li>
                  Contains software viruses or any other malicious code designed
                  to interrupt, destroy, or limit the functionality of any
                  software or hardware
                </li>
              </ul>
              <p className="mt-3">
                OpenTab reserves the right to terminate any user account that
                violates these terms, at our sole discretion and without prior
                notice.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                6. Intellectual Property
              </h2>
              <p>
                The OpenTab service, including its design, functionality, and
                underlying technology, is protected by copyright, trademark, and
                other intellectual property laws. You may not copy, modify,
                distribute, or reverse engineer any part of the service without
                our express written permission.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                7. Termination Rights
              </h2>
              <p>
                You may terminate your OpenTab account at any time by deleting
                your account through the app settings. When you delete your
                account, all information we have stored about you will be
                permanently deleted from our servers. OpenTab reserves the right
                to suspend or terminate your access to the service at any time,
                with or without cause, and with or without notice.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                8. Disclaimers and Limitation of Liability
              </h2>
              <p className="mb-3">
                OPENTAB IS PROVIDED &quot;AS IS&quot; AND &quot;AS
                AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
                NON-INFRINGEMENT. OPENTAB DOES NOT WARRANT THAT THE SERVICE WILL
                BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
              </p>
              <p className="mb-3">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, OPENTAB SHALL
                NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR
                REVENUES.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                9. Governing Law and Disputes
              </h2>
              <p>
                These Terms shall be governed by and construed in accordance
                with applicable law, without regard to its conflict of law
                provisions. Any disputes arising from these Terms or your use of
                OpenTab shall be resolved through binding arbitration.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">
                10. Changes to Terms
              </h2>
              <p>
                OpenTab reserves the right to modify these Terms of Service at
                any time. We will notify users of material changes by posting
                the updated terms on this page and updating the &quot;Last
                Updated&quot; date. Your continued use of the service after such
                changes constitutes your acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">11. Contact</h2>
              <p>
                If you have any questions about these Terms of Service, please
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
