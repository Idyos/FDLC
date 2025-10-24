import AdminAddPenya from "@/components/admin/Penyes/AddPenya/adminAddPenya";
import AdminPenyaSummary from "@/components/admin/Penyes/PenyaSummary/adminPenyaSummary";
import PageTitle from "@/components/public/pageTitle";
import YearSelector from "@/components/public/yearSelector";
import { useYear } from "@/components/shared/YearContext";
import { Input } from "@/components/ui/input";
import { PenyaInfo } from "@/interfaces/interfaces";
import { getPenyes } from "@/services/database/adminDbServices";
import { useEffect, useState } from "react";

export default function Penyes() {
    const { selectedYear } = useYear();    
    const [penyes, setPenyes] = useState<PenyaInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [penyesSearch, setPenyesSearch] = useState("");

    document.title = `Penyes ${selectedYear} - Admin`;

    // Info de penyes
    useEffect(() => {
        setIsLoading(true);
    
        getPenyes(selectedYear, (data) => {
            setPenyes(data);
            setIsLoading(false);
        });
    }, [selectedYear]);

    const filteredPenyes = penyes.filter((penya) =>
        penya.name.toLowerCase().includes(penyesSearch.toLowerCase())
    );

    return (
        <>
        <YearSelector />
        <div className="bg-gray-100 dark:bg-gray-900 rounded-4xl shadow-lg mt-4">
            <PageTitle title="Penyes" image="" />
            <div className="p-3.5 flex flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
              {isLoading ? (
              <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
              ) : (
                <>
                    <Input className="p-4 mb-4" type="search" value={penyesSearch} placeholder="Buscar penya..." onChange={(e) => setPenyesSearch(e.target.value)}/>

                    <div className="grid grid-cols-[repeat(auto-fit,_minmax(300px,_1fr))] gap-3 w-full">
                        {penyesSearch.length == 0 ? (<AdminAddPenya />) : null} 
                        {filteredPenyes.length > 0 ? (
                            filteredPenyes.map((item, index) => (
                            <AdminPenyaSummary key={index} rankingInfo={item} />
                            ))
                        ) : (
                            <p className="col-span-3 text-center text-gray-500 dark:text-gray-400">
                            No s'ha trobat cap penya.
                            </p>
                        )}
                    </div>
                </>
              )}
              </div>
        </div>
        </>
    );
}