/**
 * The flag for an ISO country code, sized to sit inside a form field.
 *
 * Kept apart from the dialling data in lib/phone.js so that module stays
 * JSX-free and exports only constants and helpers.
 */
export default function CountryFlag({ code, className = "" }) {
  return (
    <img
      src={`https://flagcdn.com/24x18/${String(code).toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/48x36/${String(code).toLowerCase()}.png 2x`}
      width={20}
      height={15}
      alt=""
      className={`inline-block shrink-0 rounded-[2px] object-cover ${className}`}
    />
  );
}
