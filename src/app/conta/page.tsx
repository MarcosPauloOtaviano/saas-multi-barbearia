import { CustomerAccount } from "@/components/customer-account";
import { CustomerShell } from "@/components/customer-shell";

export default function CustomerAccountPage() {
  return <CustomerShell showNavigation={false}><CustomerAccount /></CustomerShell>;
}
