import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import gpayIcon from "../assets/gpay.png";
import paytmIcon from "../assets/paytm.png";
import phonepayIcon from "../assets/phonepay.png";
import upiIcon from "../assets/upi.png";
import scanPaymentQrIcon from "../assets/scan-payment-qr.svg";
import { UPI_REGEX } from "~/validation-schema";
import { useSearchParams } from "react-router";
import type { Route } from "../+types/root";

export function meta({ location }: Route.MetaArgs) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://miv-pay.vercel.app";
  const searchParams = new URLSearchParams(location.search);
  const am = searchParams.get("am");
  const pn = searchParams.get("pn");
  const pa = searchParams.get("pa");
  const tn = searchParams.get("tn");

  const recipient = pn ? `to ${pn}` : pa ? `to ${pa}` : "";
  const note = tn ? `for "${tn}"` : "";
  const title = am ? `Paying ₹${am} ${recipient} ${note}`.trim() : "MIV PAY";
  const description = `Secure UPI payment page ${recipient} ${note}`.trim();

  const ogImageUrl = `${origin}/api/og-image?${searchParams.toString()}`;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },

    { property: "og:image", content: ogImageUrl },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },

    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImageUrl },
  ];
}

const paymentAppIcons = [gpayIcon, paytmIcon, phonepayIcon, upiIcon];

const Pay = () => {
  const [searchParams] = useSearchParams();
  const { pn, pa, am, tn, ct, ci, ra, sig } = Object.fromEntries(
    searchParams.entries(),
  );
  const [isLinkValid, setIsLinkValid] = useState<boolean | null>(null);
  const [customerPaymentInfo, setCustomerPaymentInfo] = useState({
    upiId: ra ? ra : "",
    utr: "",
  });
  const upiQRRef = useRef<HTMLDivElement>(null);

  const updateCustomerPaymentInfo = (key: string, value: string | number) => {
    setCustomerPaymentInfo((prev) => ({ ...prev, [key]: value }));
  };

  const UPIPaymentURL = `upi://pay?pa=${pa}${typeof pn === "string" ? `&pn=${encodeURIComponent(pn)}` : ""}&am=${am}&cu=INR${typeof tn === "string" ? `&tn=${encodeURIComponent(tn)}` : ""}`;

  useEffect(() => {
    const checkLinkValidity = async () => {
      const response = await fetch("/api/verify-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pn, pa, am, tn, ct, ci, ra, sig }),
      });
      const data = await response.json();
      const isValid = data?.data?.isValid;

      setIsLinkValid(Boolean(isValid));
    };
    checkLinkValidity();
  }, [sig]);

  if (isLinkValid === null) {
    return (
      <div>
        <h1>Verifying secure link...</h1>
      </div>
    );
  }

  const handleShareQR = async () => {
    if (!upiQRRef.current) return;

    const canvas = upiQRRef.current.querySelector("canvas");
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], "upi-qr-code.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: "Share to UPI app and Pay",
            text: "Share this QR code to UPI app to make payment.",
            files: [file],
          });
        } catch (error) {
          console.error("Error sharing QR code:", error);
        }
      } else {
        const imageUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");

        downloadLink.href = imageUrl;
        downloadLink.download = "upi-qr-code.png";

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(imageUrl);
        alert("Your browser does not support file sharing.");
      }
    });
  };

  const handleSendUTR = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (ct === "email") {
      const emailBody = `Please Verify Payment from ${pa?.toUpperCase()} ${tn ? `for Note: ${tn}` : ""} of amount ₹${am} with UTR: ${customerPaymentInfo.utr.toUpperCase()}`;

      const emailURL = `mailto:${ci}&subject=Verify payment from ${customerPaymentInfo.upiId.toUpperCase()} of ₹${am}&body=${encodeURIComponent(emailBody)}`;
      window.open(emailURL, "_blank");
    } else if (ct === "whatsapp") {
      const wtspMessage = `Please Verify Payment from *${customerPaymentInfo.upiId.toUpperCase()}* ${tn ? `for Note: ${tn}` : ""}

*Amount:* ₹${am}
*UTR:* ${customerPaymentInfo.utr.toUpperCase()}`;
      const whatsappURL = `https://wa.me/${ci}?text=${encodeURIComponent(wtspMessage)}`;
      window.open(whatsappURL, "_blank");
    }
  };

  const pageTitle = `Paying ₹${am} ${pn ? `to ${pn}` : `to ${pa}`} ${tn ? `for "${tn}"` : ""}`;
  const ogImageUrl = `${window.location.origin}/api/og${window.location.search}`;

  if (isLinkValid === true) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-extrabold text-4xl break-all">
          Paying ₹{am} {pn ? `to ${pn}` : `to ${pa}`} {tn ? `for "${tn}"` : ""}
        </h1>
        <div className="grid sm:grid-cols-[auto_1fr] gap-4 p-4 border-(--clr-border-grey-one) border rounded-(--corner-radius)">
          <div ref={upiQRRef} className="flex justify-center">
            <QRCodeCanvas
              value={UPIPaymentURL}
              level="H"
              size={200}
              style={{
                width: "fit-content",
                height: "auto",
                maxWidth: "200px",
              }}
            />
          </div>
          <div className=" flex flex-col items-start gap-2 font-semibold">
            <img
              className="h-16 hidden sm:block"
              src={scanPaymentQrIcon}
              alt=""
            />
            <label className="w-full hidden sm:block">
              Scan with any UPI app to pay
            </label>
            <label className="w-full sm:hidden">
              Share QR code to any UPI app to pay
            </label>
            <div className="flex flex-row gap-4 align-center">
              {paymentAppIcons.map((icon, index) => (
                <img key={index} className="h-8" src={icon} />
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={handleShareQR}
          className="styled-button-secondary w-full mt-2 block sm:hidden"
        >
          Share QR Code
        </button>
        <form
          onSubmit={handleSendUTR}
          className="flex flex-col items-center gap-2"
        >
          {!ra && (
            <div className="contents">
              <label className="w-full font-semibold text-(--clr-grey-one)">
                Your UPI ID
              </label>
              <input
                className="w-full px-4 py-2 rounded-(--corner-radius) border-(--clr-border-grey-two) border"
                id="customer-upiId"
                name="customer-upiId"
                placeholder="e.g., username@bank"
                type="text"
                value={customerPaymentInfo.upiId}
                pattern={UPI_REGEX.source}
                title="Please enter a valid UPI ID (e.g., username@bank)"
                required
                onChange={(e) =>
                  updateCustomerPaymentInfo("upiId", e.target.value)
                }
              />
            </div>
          )}
          <label className="w-full font-semibold text-(--clr-grey-one)">
            UTR
          </label>
          <input
            className="w-full px-4 py-2 rounded-(--corner-radius) border-(--clr-border-grey-two) border"
            id="utr"
            name="utr"
            placeholder="Enter the 12-digit UTR from your receipt"
            type="text"
            value={customerPaymentInfo.utr}
            minLength={12}
            maxLength={12}
            pattern="[0-9]{12}"
            title="UTR must be exactly 12 numeric digits"
            required
            onChange={(e) => updateCustomerPaymentInfo("utr", e.target.value)}
          />
          <button type="submit" className="styled-button w-full mt-2">
            Confirm Payment
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1>Invalid or Tampered Link</h1>
    </div>
  );
};

export default Pay;
