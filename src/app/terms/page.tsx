import type { Metadata } from "next";
import { LegalDocument, LegalSection, LegalList } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service — TheCrib",
};

const CONTACT_EMAIL = "support@1006mediagroup.com";

export default function TermsOfServicePage() {
  return (
    <LegalDocument title="Terms of Service" lastUpdated="August 11, 2026">
      <LegalSection heading="Agreement to Terms">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of TheCrib, operated by 1006
          Media Group, LLC (&quot;we,&quot; &quot;us,&quot; &quot;the Company&quot;). By checking in, creating an
          account, or otherwise using TheCrib, you agree to these Terms.
        </p>
      </LegalSection>

      <LegalSection heading="What TheCrib Does">
        <p>
          TheCrib lets comedians check in at a comedy show, independently control recording and
          promotional consent for their performance, and privately access their own recorded
          sets.
        </p>
      </LegalSection>

      <LegalSection heading="Your Material Stays Yours">
        <p>
          You retain all rights to your comedic material and performance. Checking in and
          agreeing to be recorded does not transfer ownership of your material or performance to
          us or to the venue. Recording consent, private access, and promotional permission are
          three separate choices, and none of them grants us or the venue any rights beyond what
          you&apos;ve specifically agreed to:
        </p>
        <LegalList
          items={[
            "If you don't consent to recording, your performance will not be recorded — or if it's recorded in error, it will not be used.",
            "If you consent to recording but don't grant promotional permission, your footage will only ever be accessible to you privately, never used publicly.",
            "If you choose “ask me first,” we will contact you for approval before any clip is posted anywhere. Silence is not approval.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Your Responsibilities">
        <p>
          When you check in, you agree to provide accurate information — your real contact
          email, in particular, since it&apos;s how we deliver your private access. You&apos;re
          responsible for keeping your account access (your email inbox) secure, since that&apos;s
          how you sign in.
        </p>
      </LegalSection>

      <LegalSection heading="Accounts and Access">
        <p>
          Access to private video is restricted to the account matching the comedian who
          performed. Sharing your account access with others, or attempting to access another
          comedian&apos;s private footage, is not permitted.
        </p>
      </LegalSection>

      <LegalSection heading="Service Availability">
        <p>
          We aim to keep TheCrib available and to process video promptly, but video processing
          depends on third-party infrastructure (Mux) and we don&apos;t guarantee a specific
          processing time. We may modify, suspend, or discontinue any part of the service at any
          time.
        </p>
      </LegalSection>

      <LegalSection heading="Disclaimer of Warranties">
        <p>
          TheCrib is provided &quot;as is.&quot; We do not guarantee that the service will be
          uninterrupted, error-free, or that video quality will meet any particular standard. To
          the fullest extent permitted by law, we disclaim all warranties, express or implied.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of Liability">
        <p>
          To the fullest extent permitted by law, 1006 Media Group, LLC will not be liable for
          any indirect, incidental, or consequential damages arising from your use of TheCrib,
          including loss of footage, missed notifications, or processing delays.
        </p>
      </LegalSection>

      <LegalSection heading="Termination">
        <p>
          We may suspend or terminate your access if you violate these Terms, including
          attempting to access footage that isn&apos;t yours or providing false information at
          check-in.
        </p>
      </LegalSection>

      <LegalSection heading="Governing Law">
        <p>
          These Terms are governed by the laws of the State of Illinois, without regard to its
          conflict of law principles.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to These Terms">
        <p>
          We may update these Terms from time to time. Continued use of TheCrib after a change
          means you accept the updated Terms.
        </p>
      </LegalSection>

      <LegalSection heading="Contact Us">
        <p>
          Questions about these Terms? Contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-white">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
