import type { Route } from "./+types/home";
import { useUserStore } from "~/store";
import { useState } from "react";
import { toast } from "react-toastify";
import { UPI_REGEX } from "~/validation-schema";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "MIV PAY" },
    { name: "description", content: "Secure UPI Payment Link" },
  ];
}

const CreatePaymentLink = () => {
  const user = useUserStore((state) => state);
  const [paymentLinkConfig, setPaymentLinkConfig] = useState({
    pa: user.pa ? user.pa : "",
    am: "",
    // optional fields
    ct: user.ct !== "whatsapp" ? user.ct : "whatsapp",
    ci: user.ci_email
      ? user.ci_email
      : user.ci_whatsapp
        ? user.ci_whatsapp
        : "",
    pn: user.pn ? user.pn : "",
    tn: "",
    ra: "",
  });

  const updatePaymentLinkConfig = (key: string, value: string | number) => {
    if (key === "pa" && typeof value === "string") {
      user.updateUser("pa", value);
    }
    if (key === "pn" && typeof value === "string") {
      user.updateUser("pn", value);
    }
    if (key === "ct" && typeof value === "string") {
      user.updateUser("ct", value);
    }
    if (key === "ci" && typeof value === "string") {
      user.updateUser("ci", value);
    }
    setPaymentLinkConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { pa, pn, am, ct, ci } = paymentLinkConfig;

    if (ct === "email" && ci.length === 0) {
      toast.error(
        `You've updated contact type to "Email" but you didnt provided any email address`,
      );
      return;
    }

    const link = await updatePaymentLink();

    if (navigator.canShare && navigator.canShare({ url: link })) {
      try {
        await navigator.share({
          title: `Pay ${am} to ${pn ? pn : pa}`,
          text: "Open this link to continue upi payment",
          url: link,
        });
      } catch (error) {
        console.error("Error sharing payment link, error:", error);
        toast.error("Error sharing payment link");
      }
    } else {
      try {
        await navigator.clipboard.writeText(link);
        toast.error(
          "Sharing not supported on this browser. Payment link copied to clipboard instead!",
        );
      } catch (clipboardError) {
        console.error("Clipboard copy failed:", clipboardError);
        toast.error(`Your payment link: \n\n${link}`);
      }
    }
  };

  const updatePaymentLink = async () => {
    try {
      const { pa, pn, am, tn, ct, ci, ra } = paymentLinkConfig;

      let validCt;
      if (ct === "whatsapp" && ci?.length === 0) {
        validCt = "";
      } else {
        validCt = ct;
      }

      const cleanValue = (val: unknown) =>
        typeof val === "string" && val.trim() === "" ? undefined : val;

      const response = await fetch("/api/generate-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pn: cleanValue(pn),
          pa: cleanValue(pa),
          am: cleanValue(am),
          tn: cleanValue(tn),
          ct: cleanValue(validCt),
          ci: cleanValue(ci),
          ra: cleanValue(ra),
        }),
      });

      const data = await response.json();

      const link = data.data?.link;
      return link;
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-29 md:mb-0">
      <div className="@container w-full aspect-video flex flex-col items-center justify-center font-semibold text-[8cqw] lg:text-[4cqw] rounded-4xl mb-4 bg-linear-to-br from-(--clr-grey-one)/40 via-(--clr-grey-one)/10 to-(--clr-grey-one)/50 border border-slate-100 text-(--clr-grey-one) hover:scale-110 hover:-skew-x-5 duration-500">
        MIV-PAY
        <ul className="flex flex-row gap-6 text-[0.75rem] md:text-[0.87rem]">
          <li className="list-disc">Integratable</li>
          <li className="list-disc">Secure</li>
          <li className="list-disc">Serverless</li>
        </ul>
      </div>
      <h1 className="font-semibold text-2xl">Create UPI Based Payment Link</h1>
      <label className="label-text">Receiver's UPI ID</label>
      <input
        className="w-full px-4 py-2 rounded-(--corner-radius) border-(--clr-border-grey-two) border"
        id="receiver-upiId"
        name="receiver-upiId"
        placeholder="Enter Receiver's UPI ID"
        type="text"
        value={paymentLinkConfig.pa}
        pattern={UPI_REGEX.source}
        title="Please enter a valid UPI ID (e.g., username@bank)"
        required
        onChange={(e) => updatePaymentLinkConfig("pa", e.target.value)}
      />
      <label className="label-text">Receiver's Name (optional)</label>
      <input
        className="w-full px-4 py-2 rounded-(--corner-radius) border-(--clr-border-grey-two) border"
        id="receiver-name"
        name="receiver-name"
        placeholder="Enter Receiver's Name"
        type="text"
        value={paymentLinkConfig.pn}
        onChange={(e) => updatePaymentLinkConfig("pn", e.target.value)}
      />
      <label className="label-text">Amount</label>
      <input
        className="w-full px-4 py-2 rounded-(--corner-radius) border-(--clr-border-grey-two) border"
        id="amount"
        name="amount"
        placeholder="Enter Amount"
        type="text"
        required
        value={paymentLinkConfig.am}
        onChange={(e) => {
          const value = e.target.value;
          if (/^\d*\.?\d*$/.test(value)) {
            updatePaymentLinkConfig("am", value);

            if (Number(value) <= 0) {
              e.target.setCustomValidity("Amount must be greater than 0.");
            } else {
              e.target.setCustomValidity("");
            }
          }
        }}
      />
      <label className="label-text">Transaction Note</label>
      <input
        className="w-full px-4 py-2 rounded-(--corner-radius) border-(--clr-border-grey-two) border"
        id="transaction-note"
        name="transaction-note"
        placeholder="Enter Transaction Note"
        type="text"
        // required
        value={paymentLinkConfig.tn}
        onChange={(e) => updatePaymentLinkConfig("tn", e.target.value)}
      />
      <label className="label-text mt-2">
        Where should customers send the UTR?
      </label>
      <div className="flex gap-2 w-full">
        {/* Dropdown to select type */}
        <select
          className="px-2 py-2 rounded-(--corner-radius) border-(--clr-border-grey-two) border bg-white"
          value={paymentLinkConfig.ct}
          onChange={(e) => updatePaymentLinkConfig("ct", e.target.value)}
        >
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <input
          className="w-full px-4 py-2 rounded-(--corner-radius) border-(--clr-border-grey-two) border"
          id="contact-info"
          name="contact-info"
          type={paymentLinkConfig.ct === "email" ? "email" : "tel"}
          placeholder={
            paymentLinkConfig.ct === "email"
              ? "Enter Email Address"
              : "Enter WhatsApp Number (with country code)"
          }
          value={paymentLinkConfig.ci}
          onChange={(e) => updatePaymentLinkConfig("ci", e.target.value)}
          pattern={
            paymentLinkConfig.ct === "whatsapp"
              ? "^\\+?[1-9]\\d{1,14}$"
              : undefined
          }
          title={
            paymentLinkConfig.ct === "whatsapp"
              ? "Enter a valid phone number, e.g., +919876543210"
              : undefined
          }
        />
      </div>
      <label className="label-text mt-1">Customer UPI ID (optional)</label>
      <input
        className="w-full px-4 py-2 rounded-(--corner-radius) border-(--clr-border-grey-two) border"
        id="customer-upiId"
        name="customer-upiId"
        placeholder="Enter Customer UPI ID"
        type="text"
        pattern={UPI_REGEX.source}
        title="Please enter a valid UPI ID (e.g., username@bank)"
        value={paymentLinkConfig.ra}
        onChange={(e) => updatePaymentLinkConfig("ra", e.target.value)}
      />
      <div className="max-md:fixed bottom-4 left-4 max-md:w-[calc(100vw-32px)] bg-white flex flex-col gap-2">
        <button type="submit" className="styled-button mt-4">
          Create & Share Payment Link
        </button>
        <a
          href="https://github.com/praxham/miv-pay/blob/main/README.md"
          className="text-[0.87rem] text-center"
        >
          API Docs
        </a>
      </div>
    </form>
  );
};

export default CreatePaymentLink;
