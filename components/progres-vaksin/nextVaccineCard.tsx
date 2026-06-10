import styles from "./NextVaccineCard.module.css";

interface NextVaccineCardProps {
    vaccineName?: string;
    scheduleDate?: string | null;
    remainingDays: number;
    h3?: boolean;
    h1?: boolean;
  }
  
  export default function NextVaccineCard({
    vaccineName,
    scheduleDate,
    remainingDays,
    h3,
    h1,
  }: NextVaccineCardProps) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>Vaksinasi Berikutnya</span>
        </div>
  
        <h2 className={styles.vaccineName}>
          {vaccineName}
        </h2>
  
        <p className={styles.info}>
          {scheduleDate} • {remainingDays} hari lagi
        </p>

        <div className={styles.badges}>
          <span className={h3 ? styles.badgetrue: styles.badgefalse}>H-3</span>
          <span className={h1 ? styles.badgetrue: styles.badgefalse}>H-1</span>
        </div>
      </div>
    );
  }