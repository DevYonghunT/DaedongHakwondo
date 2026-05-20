import type { Academy, School } from "@/lib/types";
import generatedData from "./generated-dump-data.json";

type GeneratedDumpData = {
  importedDataMeta: {
    source: string;
    importedAt: string;
    totalSchools: number;
    totalAcademies: number;
    selectedSchools: number;
    selectedAcademies: number;
  };
  importedSchoolDirectory: School[];
  importedSchools: School[];
  importedAcademies: Academy[];
};

const typedGeneratedData = generatedData as GeneratedDumpData;

export const importedDataMeta = typedGeneratedData.importedDataMeta;
export const importedSchoolDirectory: School[] = typedGeneratedData.importedSchoolDirectory;
export const importedSchools: School[] = typedGeneratedData.importedSchools;
export const importedAcademies: Academy[] = typedGeneratedData.importedAcademies;
