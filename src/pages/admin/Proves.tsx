import AdminAddPenya from "@/components/admin/Penyes/AddPenya/adminAddPenya";
import AdminPenyaSummary from "@/components/admin/Penyes/PenyaSummary/adminPenyaSummary";
import AdminProvaSummary from "@/components/admin/Proves/ProvaSummary/adminProvaSummary";
import PageTitle from "@/components/public/pageTitle";
import YearSelector from "@/components/public/yearSelector";
import { useYear } from "@/components/shared/YearContext";
import { Input } from "@/components/ui/input";
import { PenyaInfo, ProvaSummary } from "@/interfaces/interfaces";
import { getProves } from "@/services/database/adminDbServices";

import { useEffect, useState } from "react";

export default function Proves() {
    const { selectedYear } = useYear();    
  const [proves, setProves] = useState<ProvaSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [provesSearch, setProvesSearch] = useState("");

    // Info de proves
    useEffect(() => {
        setIsLoading(true);
    
        getProves(selectedYear, (data) => {
            setProves(data);
            setIsLoading(false);
        });
    }, [selectedYear]);

    const filteredProves = proves.filter((prova) =>
        prova.name.toLowerCase().includes(provesSearch.toLowerCase())
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
                    <Input className="p-4 mb-4" type="search" value={provesSearch} placeholder="Buscar prova..." onChange={(e) => setProvesSearch(e.target.value)}/>

                    <div className="grid grid-cols-[repeat(auto-fit,_minmax(300px,_1fr))] gap-3 w-full">
                        {provesSearch.length == 0 ? (<AdminAddPenya />) : null} 
                        {filteredProves.length > 0 ? (
                            filteredProves.map((item, index) => (
                            <AdminProvaSummary key={index} provaSummary={item} />
                            ))
                        ) : (
                            <p className="col-span-3 text-center text-gray-500 dark:text-gray-400">
                            No s'ha trobat cap prova.
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