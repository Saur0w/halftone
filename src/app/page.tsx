"use client";

import { useState } from "react";
import styles from "./page.module.css";
import Studio from "@/components/Studio";
import Buy from "@/components/BuyMeCoffee";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.page}>
      <Studio />
      <Buy 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        bmcUsername="your_handle"
        upiId="yourname@upi"
      />
    </div>
  );
}