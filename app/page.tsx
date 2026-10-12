import { OfficeApp } from "./OfficeApp";
import { getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return (
    <OfficeApp
      initialUser={
        user ? { displayName: user.displayName, email: user.email } : undefined
      }
    />
  );
}
