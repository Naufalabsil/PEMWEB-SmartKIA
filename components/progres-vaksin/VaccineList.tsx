import styles from "./VaccineList.module.css";

interface Vaccine {
  id: number;
  nama: string;
  usia: string;
  selesaiPada?: string | null;
  jadwalIdeal: string;
}

interface VaccineListProps {
  vaccines: Vaccine[];
}

export default function VaccineList({
  vaccines,
}: VaccineListProps) {
  return (
    <div>
      <h2 className={styles.sectionTitle}>
        Daftar Vaksin (Buku KIA)
      </h2>

      <div className={styles.list}>
        {vaccines.map((vaccine) => {
          const isCompleted = vaccine.selesaiPada != null;

          return (
            <div
              key={vaccine.id}
              className={
                isCompleted
                  ? styles.cardCompleted
                  : styles.cardPending
              }
            >
              <div
                className={
                  isCompleted
                    ? styles.iconCompleted
                    : styles.iconPending
                }
              >
                {isCompleted ? "✓" : "!"}
              </div>

              <div className={styles.content}>
                <h3>{vaccine.nama}</h3>

                <p className={styles.age}>
                  Usia: {vaccine.usia}
                </p>

                {isCompleted ? (
                  <p className={styles.completed}>
                    ✓ Selesai: {vaccine.selesaiPada}
                  </p>
                ) : (
                  <p className={styles.pending}>
                    ✕ Belum: {vaccine.jadwalIdeal}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}