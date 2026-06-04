export const formatDate = (date?: string | Date | null): string => {
    if (!date) return "-";
  
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  };