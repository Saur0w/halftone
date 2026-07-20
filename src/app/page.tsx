import styles from "./page.module.css";
import Studio from "@/components/Studio";

export default function Home() {
  return (
    <div className={styles.page}>
      <Studio />
    </div>
  );
}
