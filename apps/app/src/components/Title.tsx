import React from "react";
import Head from "expo-router/head";

/** Document title on web; a no-op on native. */
export function Title({ children }: { children: string }) {
  return (
    <Head>
      <title>{children === "Sprint" ? "Sprint" : `${children} · Sprint`}</title>
    </Head>
  );
}
