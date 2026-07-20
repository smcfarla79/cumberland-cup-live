"use client";

import {
  GRILL_DISCLAIMER,
  GRILL_INFO,
  GRILL_MENU,
  GRILL_PAGE_URL,
} from "@/lib/greens-view-menu";

const SEWANEE_PURPLE = "#582C83";

function formatPrice(price: number | string) {
  const num = typeof price === "number" ? price : Number(price);
  return Number.isFinite(num) && String(price).trim() !== "" ? `$${num}` : price;
}

function VegetarianBadge() {
  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
      style={{ backgroundColor: "#3d8b5a" }}
      title="Vegetarian"
      aria-label="Vegetarian"
    >
      V
    </span>
  );
}

export function GrillTab() {
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-6 pb-16">
      <header className="animate-rise">
        <p
          className="text-xs tracking-[0.18em] uppercase"
          style={{ color: SEWANEE_PURPLE }}
        >
          On course dining
        </p>
        <h1 className="font-display mt-2 text-3xl text-ink sm:text-4xl">
          {GRILL_INFO.name}
        </h1>
        <p className="mt-2 text-sm text-muted">{GRILL_INFO.tagline}</p>
        {GRILL_INFO.blurb.map((p) => (
          <p key={p.slice(0, 24)} className="mt-3 text-sm leading-relaxed text-muted">
            {p}
          </p>
        ))}
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 animate-fade">
        <div className="rounded-2xl border border-mist bg-white px-4 py-3.5 shadow-[0_4px_14px_rgba(20,32,27,0.06)]">
          <p
            className="text-[11px] font-semibold tracking-[0.14em] uppercase"
            style={{ color: SEWANEE_PURPLE }}
          >
            Hours
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink">
            {GRILL_INFO.hours.map((row) => (
              <li
                key={row.days}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="font-medium">{row.days}</span>
                <span className="text-right text-muted">{row.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-mist bg-white px-4 py-3.5 shadow-[0_4px_14px_rgba(20,32,27,0.06)]">
          <p
            className="text-[11px] font-semibold tracking-[0.14em] uppercase"
            style={{ color: SEWANEE_PURPLE }}
          >
            Contact
          </p>
          <a
            href={GRILL_INFO.phoneHref}
            className="mt-2 block text-lg font-semibold tabular-nums text-ink hover:opacity-80"
            style={{ color: SEWANEE_PURPLE }}
          >
            {GRILL_INFO.phone}
          </a>
          <p className="mt-1 text-sm text-muted">Call to order or check wait</p>
          <p className="mt-3 text-xs text-muted">{GRILL_INFO.address}</p>
          <p className="mt-2 text-xs font-medium text-ink">
            Full bar — cocktails listed below
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs animate-fade">
        <span className="inline-flex items-center gap-1.5 text-muted">
          <VegetarianBadge /> Vegetarian
        </span>
        <a
          href={GRILL_PAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
          style={{ color: SEWANEE_PURPLE }}
        >
          Official grill page →
        </a>
      </div>

      <nav
        className="scroll-fade-x mt-6 flex gap-2 overflow-x-auto pb-1 animate-fade"
        aria-label="Menu sections"
        data-swipe-ignore
      >
        {GRILL_MENU.map((section) => (
          <a
            key={section.id}
            href={`#grill-${section.id}`}
            className="shrink-0 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide whitespace-nowrap uppercase transition hover:opacity-80"
            style={{
              borderColor: `${SEWANEE_PURPLE}44`,
              color: SEWANEE_PURPLE,
              backgroundColor: `${SEWANEE_PURPLE}0a`,
            }}
          >
            {section.title}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-6 animate-rise">
        {GRILL_MENU.map((section) => (
          <section
            key={section.id}
            id={`grill-${section.id}`}
            className={
              section.highlighted
                ? "rounded-2xl border px-3.5 py-3.5 sm:px-4"
                : undefined
            }
            style={
              section.highlighted
                ? {
                    borderColor: `${SEWANEE_PURPLE}55`,
                    backgroundColor: `${SEWANEE_PURPLE}0d`,
                  }
                : undefined
            }
          >
            <div className="mb-3 flex items-baseline justify-between gap-2 border-b pb-2"
              style={{ borderColor: `${SEWANEE_PURPLE}33` }}
            >
              <h2
                className="text-sm font-semibold tracking-[0.16em] uppercase"
                style={{ color: SEWANEE_PURPLE }}
              >
                {section.title}
              </h2>
              {section.priceNote ? (
                <span className="shrink-0 text-sm font-semibold tabular-nums whitespace-nowrap text-ink">
                  {formatPrice(section.priceNote)} each
                </span>
              ) : null}
            </div>

            <ul className="space-y-4">
              {section.items.map((item) => (
                <li key={item.name}>
                  <div className="flex items-baseline gap-2">
                    {item.vegetarian ? <VegetarianBadge /> : null}
                    <p className="text-sm font-semibold text-ink">
                      {item.name}
                    </p>
                    <span
                      className="min-w-[0.75rem] flex-1 border-b border-dotted border-ink/25"
                      aria-hidden
                    />
                    <p
                      className="shrink-0 text-sm font-semibold tabular-nums whitespace-nowrap"
                      style={{ color: SEWANEE_PURPLE }}
                    >
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  {item.description ? (
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {item.description}
                    </p>
                  ) : null}
                  {item.extras ? (
                    <p className="mt-1 text-xs italic text-muted">{item.extras}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-muted">
        {GRILL_DISCLAIMER}
      </p>
      <p className="mt-2 text-xs text-muted">
        Menu from Green&apos;s View Grill · hours &amp; copy from{" "}
        <a
          href={GRILL_PAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
          style={{ color: SEWANEE_PURPLE }}
        >
          thecourseatsewanee.com
        </a>
        . Prices subject to change.
      </p>
    </section>
  );
}
