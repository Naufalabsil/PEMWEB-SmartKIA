import styles from "./progressbar.module.css";

interface VaccinationProgressProps {
    completed: number;
    total: number;
  }

export default function VaccinationProgress({
    completed,
    total,
  }: VaccinationProgressProps) {
    const percentage = Math.round((completed / total) * 100);
  
    return (
        <div className={styles.card}>
        <div className={styles.header}>
          <h3>Progres Vaksinasi</h3>
          <span>{completed}/{total}</span>
        </div>
  
        <div className={styles.progressContainer}>
          <div
            className={styles.progressBar}
            style={{ width: `${percentage}%` }}
          />
        </div>
  
        <p className={styles.description}>
          {percentage}% vaksin wajib selesai (Sesuai jadwal Buku KIA)
        </p>
      </div>
    );
  }