import { motion } from "framer-motion";
import AdminProvaSummary from "@/components/admin/Proves/ProvaSummary/adminProvaSummary";
import PageTitle from "@/components/public/pageTitle";
import YearSelector from "@/components/public/yearSelector";
import LoadingAnimation from "@/components/shared/loadingAnim";
import { useYear } from "@/components/shared/YearContext";
import { Input } from "@/components/ui/input";
import { ProvaSummary } from "@/interfaces/interfaces";
import { getProves } from "@/services/database/adminDbServices";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useTheme } from "@/components/Theme/theme-provider";
import { useNavigate } from "react-router-dom";

export default function Proves() {
    const { theme } = useTheme();
    const { selectedYear } = useYear();
    const navigate = useNavigate();

    const [proves, setProves] = useState<ProvaSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [provesSearch, setProvesSearch] = useState("");


    document.title = `Proves ${selectedYear} - Admin`;

    // Info de proves
    useEffect(() => {
        setIsLoading(true);
    
        getProves(selectedYear, (data) => {
            console.log(data);
            setProves(data);
            setIsLoading(false);
        });
    }, [selectedYear]);

    const filteredProves = proves.filter((prova) =>
        prova.name.toLowerCase().includes(provesSearch.toLowerCase())
    );

    const onCreateNewProva = () => {
        navigate(`/admin/createProva`);
    }

    return (
        <>
        <YearSelector />
        <div className="bg-gray-100 dark:bg-gray-900 rounded-4xl shadow-lg mt-4">
            <PageTitle title="Proves" image="" />
            <div className="p-3.5 flex flex-col items-center justify-start bg-white dark:bg-black rounded-4xl ">
              {isLoading ? (
                <LoadingAnimation />
              ) : (
                <>
                    <Input className="p-4 mb-4" type="search" value={provesSearch} placeholder="Buscar prova..." onChange={(e) => setProvesSearch(e.target.value)}/>

                    <div className="grid grid-cols-1 gap-3 w-full">
                        {provesSearch.length == 0 ? (
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="relative h-36 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
                                onClick={onCreateNewProva}
                            >
                                <div className="cursor-pointer w-full relative z-10 flex items-center justify-center h-full dark:text-white text-gray-900">
                                    <div className="dark:bg-gray-800 bg-gray-200 flex justify-center items-center p-8 rounded-full shadow-lg w-24 h-24">
                                        <Plus size={40} color={theme == "dark" ? "white" : "black"} />
                                    </div>
                                </div>
                            </motion.div>
                        ) : null} 
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