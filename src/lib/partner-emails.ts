import { emailBody } from "@/lib/email-body";
import { siteConfig } from "@/lib/site-config";

// The one email the partner portal sends today: an invite to set a password.
export function partnerInviteEmail({ name, providerName, inviteUrl }: { name: string; providerName: string; inviteUrl: string }) {
  return {
    subject: `Your ${siteConfig.brandShortName} pharmacy portal invite`,
    ...emailBody(
      [
        `Hello ${name},`,
        `You've been invited to the ${siteConfig.brandShortName} pharmacy portal for ${providerName}. It shows how many visitors our comparison sends to your website, and where from.`,
        "Open the link below to choose your password. It works once and expires in 7 days.",
      ],
      { url: inviteUrl, label: "Set my password" },
      `If you weren't expecting this, you can ignore it. The portal only shows ${providerName}'s own figures, and nothing that identifies a visitor.`,
    ),
  };
}
