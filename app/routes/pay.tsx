import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import gpayIcon from "../assets/gpay.png";
import paytmIcon from "../assets/paytm.png";
import phonepayIcon from "../assets/phonepay.png";
import upiIcon from "../assets/upi.png";
import rupeeScanner from "../assets/rupee-scanner.svg";
import { UPI_REGEX } from "~/validation-schema";
import { useSearchParams } from "react-router";
import type { Route } from "../+types/root";
import { readableAmount } from "~/functions";

export function meta({ location }: Route.MetaArgs) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://miv-pay.vercel.app";
  const searchParams = new URLSearchParams(location.search);
  const am = searchParams.get("am");
  const readableAmountValue = am && readableAmount(am);
  const pn = searchParams.get("pn");
  const pa = searchParams.get("pa");
  const tn = searchParams.get("tn");

  const recipient = pn ? `to ${pn}` : pa ? `to ${pa}` : "";
  const note = tn ? `for "${tn}"` : "";
  const title = am
    ? `Paying ₹${readableAmountValue} ${recipient} ${note}`.trim()
    : "MIV PAY";
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
  const { pn, pa, am, tn, ct, ci, ra, vurl, sig } = Object.fromEntries(
    searchParams.entries(),
  );
  const readableAmountValue = readableAmount(am);
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
        <h1 className="font-semibold text-(--clr-grey-three) w-full text-center">
          Verifying secure link...
        </h1>
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

    // sends utr back to the tab which opened this page
    if (window.opener) {
      window.opener.postMessage(
        {
          status: "SUCCESS",
          utr: customerPaymentInfo.utr,
        },
        "*",
      );
    }

    if (ct === "email") {
      const emailBody = `Please Verify Payment from ${pa?.toUpperCase()} ${tn ? `for Note: ${tn}` : ""} of amount ₹${readableAmountValue} with UTR: ${customerPaymentInfo.utr.toUpperCase()}

${
  vurl
    ? `Verify payment here:
${vurl}`
    : ""
}`;

      const emailSubject = encodeURIComponent(
        `Verify payment from ${customerPaymentInfo.upiId.toUpperCase()} of ₹${readableAmountValue}`,
      );
      const emailURL = `mailto:${ci}?subject=${emailSubject}&body=${encodeURIComponent(emailBody)}`;
      console.log(emailURL);

      window.open(emailURL, "_blank");
    } else if (ct === "whatsapp") {
      const wtspMessage = `Please Verify Payment from *${customerPaymentInfo.upiId.toUpperCase()}* ${tn ? `for Note: ${tn}` : ""}

*Amount:* ₹${readableAmountValue}
*UTR:* ${customerPaymentInfo.utr.toUpperCase()}
${
  vurl
    ? `*Verify Payment Here:*
${vurl}`
    : ""
}`;
      const whatsappURL = `https://wa.me/${ci}?text=${encodeURIComponent(wtspMessage)}`;
      window.open(whatsappURL, "_blank");
    }
    window.close();
  };

  if (isLinkValid === true) {
    return (
      <div className="flex flex-col gap-4 bg-[#F7F8FB] p-4 rounded-(--corner-radius) mb-18 md:mb-0">
        <div className="flex flex-row gap-4 justify-between items-center">
          <div className="px-4 py-2 bg-black text-white w-fit rounded-(--corner-radius) font-extrabold">
            MIV-PAY
          </div>
          <span className="text-(--clr-grey-two) font-medium text-[0.87rem] flex flex-row items-center gap-1">
            <svg
              width="14px"
              height="14px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                {" "}
                <path
                  d="M7 10.0288C7.47142 10 8.05259 10 8.8 10H15.2C15.9474 10 16.5286 10 17 10.0288M7 10.0288C6.41168 10.0647 5.99429 10.1455 5.63803 10.327C5.07354 10.6146 4.6146 11.0735 4.32698 11.638C4 12.2798 4 13.1198 4 14.8V16.2C4 17.8802 4 18.7202 4.32698 19.362C4.6146 19.9265 5.07354 20.3854 5.63803 20.673C6.27976 21 7.11984 21 8.8 21H15.2C16.8802 21 17.7202 21 18.362 20.673C18.9265 20.3854 19.3854 19.9265 19.673 19.362C20 18.7202 20 17.8802 20 16.2V14.8C20 13.1198 20 12.2798 19.673 11.638C19.3854 11.0735 18.9265 10.6146 18.362 10.327C18.0057 10.1455 17.5883 10.0647 17 10.0288M7 10.0288V8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V10.0288"
                  stroke="var(--clr-grey-two)"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></path>{" "}
              </g>
            </svg>{" "}
            <span>Secure Link</span>
          </span>
        </div>
        <div className="flex flex-col gap-2 font-semibold">
          <span className="text-(--clr-grey-two)">Paying</span>
          <h1 className="font-extrabold text-6xl underline">
            ₹{readableAmount(am)}
          </h1>
          <span className="inline">
            {pn && <span>to {pn}</span>}{" "}
            {tn && (
              <span className="text-(--clr-grey-two) font-normal">
                for "{tn}"
              </span>
            )}
          </span>
          <span className="text-(--clr-grey-two) font-medium text-[0.87rem]">
            {pa}
          </span>
        </div>
        <div className="bg-white grid sm:grid-cols-[auto_1fr] md:grid-cols-[1fr_auto] gap-4 p-4 border-(--clr-border-grey-one) border border-dashed rounded-(--corner-radius)">
          <div
            ref={upiQRRef}
            className="w-fit mx-auto flex justify-center p-4 border border-(--clr-border-grey-one) rounded-(--corner-radius)"
          >
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
          <div className="flex flex-col items-start gap-2 font-semibold">
            <img
              className="h-12 mb-2 hidden sm:block"
              src={rupeeScanner}
              alt=""
            />
            <label className="max-w-41.75 hidden sm:block">
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
        {ci && (
          <div className="flex flex-row items-center gap-2">
            <div className="-ml-5.5 w-4 aspect-square bg-white rounded-full" />
            <hr className="border border-(--clr-border-grey-one) border-dashed w-full" />
            <div className="-mr-5.5 w-4 aspect-square bg-white rounded-full" />
          </div>
        )}

        {ci && (
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
            <button
              type="submit"
              className="styled-button max-md:fixed bottom-4 left-4 max-md:w-[calc(100vw-32px)] w-full mt-2"
            >
              Confirm Payment
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-semibold text-(--clr-grey-three) w-full text-center">
        Invalid or Tampered Link
      </h1>
    </div>
  );
};

export default Pay;
