import { useUserStore } from "@/store";
import { UPI_REGEX } from "@/validation-schema";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const CreatePaymentLink = () => {
  const user = useUserStore((state) => state);
  const [paymentLinkConfig, setPaymentLinkConfig] = useState({
    pa: user.pa ? user.pa : "",
    am: "",
    ct: user.ct !== "whatsapp" ? user.ct : "whatsapp",
    ci: user.ci_email
      ? user.ci_email
      : user.ci_whatsapp
        ? user.ci_whatsapp
        : "",
    // optional fields
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

    const { pa, pn, am } = paymentLinkConfig;

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
          ct: cleanValue(ct),
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <h1 className="font-semibold text-2xl">Create UPI Based Payment Link</h1>
      <label className="w-full font-semibold mt-2 text-(--clr-grey-one)">
        Receiver's UPI ID
      </label>
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
      <label className="w-full font-semibold text-(--clr-grey-one)">
        Receiver's Name (optional)
      </label>
      <input
        className="w-full px-4 py-2 rounded-(--corner-radius) border-(--clr-border-grey-two) border"
        id="receiver-name"
        name="receiver-name"
        placeholder="Enter Receiver's Name"
        type="text"
        value={paymentLinkConfig.pn}
        onChange={(e) => updatePaymentLinkConfig("pn", e.target.value)}
      />
      <label className="w-full font-semibold text-(--clr-grey-one)">
        Amount
      </label>
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
      <label className="w-full font-semibold text-(--clr-grey-one)">
        Transaction Note
      </label>
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
      <label className="w-full font-semibold text-(--clr-grey-one) mt-2">
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

        {/* Input field that changes validation based on the dropdown */}
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
          required
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
      <label className="w-full font-semibold text-(--clr-grey-one)">
        Customer UPI ID (optional)
      </label>
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
      <button type="submit" className="styled-button mt-4">
        Create & Share Payment Link
      </button>
      <a href="/docs" className="text-[0.87rem] text-center">
        API Docs
      </a>
    </form>
  );
};

// http://localhost:3000/pay/?&pa=prathampatankar1234@okicici&am=10&ct=whatsapp&ci=9076006477&sig=aa3e378d
export default CreatePaymentLink;
