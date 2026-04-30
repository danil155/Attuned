import LegalPage from "../components/legal/LegalPage";
import { userAgreement } from "../data";

export default function Terms() {
    return <LegalPage data={userAgreement} />
}
