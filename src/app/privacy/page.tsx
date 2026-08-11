import type { Metadata } from "next";
import { LegalDocument, LegalSection, LegalList } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy — TheCrib",
};

const CONTACT_EMAIL = "support@1006mediagroup.com";

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument title="Privacy Policy" lastUpdated="August 11, 2026">
      <LegalSection heading="Overview">
        <p>
          This Privacy Policy explains what information TheCrib collects when you check in at a
          comedy show through our platform, how we use it, and the choices you have. TheCrib is
          operated by 1006 Media Group, LLC (&quot;we,&quot; &quot;us,&quot; &quot;the Company&quot;).
        </p>
      </LegalSection>

      <LegalSection heading="Information We Collect">
        <p>When you check in at a show, we collect:</p>
        <LegalList
          items={[
            "Stage name (required) and legal name (optional)",
            "Email address (required) and phone number (optional)",
            "Instagram and TikTok handles (optional)",
            "Expected set length (optional)",
            "Your consent choices: whether you agree to be recorded, whether you want private access to your own footage, and whether the venue may use clips of your performance for promotion",
          ]}
        />
        <p>
          If you agree to be recorded, we (or the venue&apos;s media partner) also create video
          recordings of your performance. If you sign in, we store your session via Supabase
          Auth — see &quot;Cookies&quot; below.
        </p>
      </LegalSection>

      <LegalSection heading="How We Use This Information">
        <p>We use this information to:</p>
        <LegalList
          items={[
            "Identify you at check-in and connect you with your performance",
            "Honor the specific consent choices you made — see “Your Consent Choices” below",
            "Deliver private video access to you, if you requested it",
            "Contact you about clips or promotional use, if you asked us to ask first",
            "Operate, maintain, and improve the service",
          ]}
        />
        <p>
          We do not use your information for anything beyond what&apos;s described here, and we
          do not sell your personal information.
        </p>
      </LegalSection>

      <LegalSection heading="Your Consent Choices">
        <p>
          TheCrib is built around one core idea: you stay in control of your material. We keep
          three separate, independent decisions on record for every check-in — recording,
          private access, and promotional use. Agreeing to be recorded does not automatically
          grant permission to use your footage for promotion. Choosing &quot;ask me first&quot; means
          exactly that — it is not permission to publish. Choosing not to allow promotional use
          does not affect your ability to privately receive your own footage.
        </p>
      </LegalSection>

      <LegalSection heading="Who We Share Information With">
        <p>
          We use the following third-party service providers to operate TheCrib. Each only
          receives the information necessary to perform its function:
        </p>
        <LegalList
          items={[
            "Supabase — database hosting, authentication, and account management",
            "Mux — video processing, storage, and private, signed video streaming",
            "Resend — sending you check-in confirmation, sign-in, and “your set is ready” emails",
            "Vercel — application hosting",
          ]}
        />
        <p>
          We do not share your information with anyone else, except as required by law or to
          protect our legal rights.
        </p>
      </LegalSection>

      <LegalSection heading="Private Video Access">
        <p>
          Recorded performances are never publicly browsable. Accessing your own footage
          requires signing in to your own account — our systems verify that a performance
          belongs to you before allowing playback. A link to a video is never, by itself, enough
          to view it.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies">
        <p>
          We use cookies to keep you signed in and to protect your account, via Supabase Auth. We
          do not use advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection heading="Data Retention">
        <p>
          We retain your check-in information and consent records for as long as your account
          remains active, or as needed to provide the service — for example, consent records
          tied to a recording that&apos;s already been used with permission are kept as evidence
          of that permission. We retain video recordings for 6 months after the show, unless you
          request deletion sooner. You can request deletion of your information at any time —
          see &quot;Your Rights&quot; below.
        </p>
      </LegalSection>

      <LegalSection heading="Your Rights">
        <p>
          You can request a copy of the information we have about you, or ask us to delete it,
          by contacting us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-white">
            {CONTACT_EMAIL}
          </a>
          . We will honor deletion requests except where we&apos;re required to keep certain
          records, such as consent records tied to footage that&apos;s already been used with
          permission.
        </p>
      </LegalSection>

      <LegalSection heading="Children's Privacy">
        <p>
          TheCrib is intended for adult comedians and comedy club patrons. We do not knowingly
          collect information from children under 13 (or the relevant minimum age in your
          jurisdiction).
        </p>
      </LegalSection>

      <LegalSection heading="Changes to This Policy">
        <p>
          We may update this policy from time to time. If we make material changes, we&apos;ll
          update the &quot;Last updated&quot; date above.
        </p>
      </LegalSection>

      <LegalSection heading="Contact Us">
        <p>
          Questions about this policy? Contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-white">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
