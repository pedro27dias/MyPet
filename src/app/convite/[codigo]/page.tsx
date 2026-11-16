import { AcceptInvite } from "@/components/pet/accept-invite";

export const metadata = { title: "Convite · MyPet" };

export default async function ConvitePage({ params }: PageProps<"/convite/[codigo]">) {
  const { codigo } = await params;
  return <AcceptInvite code={codigo} />;
}
