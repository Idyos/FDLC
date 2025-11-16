import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin
} from "@vis.gl/react-google-maps";
import { Ubication } from "@/interfaces/interfaces";
import { Badge } from "../ui/badge";
import { Link } from "react-router-dom";
import { Navigation } from "lucide-react";

type LocationDisplayProps = {
  location: Ubication | null | undefined;
  height?: string | number;
};

export function LocationDisplay({ location, height = "250px" }: LocationDisplayProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const hasLocation =
    location?.lat !== null &&
    location?.lng !== null &&
    typeof location?.lat === "number" &&
    typeof location?.lng === "number";

  console.log("LocationDisplay - location:", location, hasLocation);

  if (!hasLocation) {
    return (
      <div className="text-center opacity-70 italic py-4">
        No hi ha ubicació assignada.
      </div>
    );
  }

  const { lat, lng, name } = location;

  // Link de Google Maps
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="flex flex-col gap-3">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultZoom={15}
          defaultCenter={(lat && lng) ? { lat, lng } : { lat: 40.8124970852596, lng: 0.5212677564206379 }}
          disableDefaultUI={true}
          mapId="e281a4f58cc63ae81dedfb32"
          style={{
            width: "100%",
            height: height,
            borderRadius: "12px",
            overflow: "hidden"
          }}
        >
          {(lat && lng) && (
            <>
              <AdvancedMarker position={{ lat, lng }}>
                <Pin background="#4285F4" borderColor="#1a73e8" glyphColor="white" />
              </AdvancedMarker>

              <Badge
                asChild
                variant="secondary"
                className="bg-blue-500 z-10 mt-2 h-10 flex items-center justify-center rounded-full absolute bottom-2 left-1/2 transform -translate-x-1/2"
              >
              <Link to={mapsUrl} target="_blank" rel="noopener noreferrer">
                <p>Com arribar </p><Navigation scale={500} />
              </Link>
            </Badge>
            </>
          )}
        </Map>
      </APIProvider>

      {/* Nombre opcional */}
      {name && (
        <p className="text-center opacity-80 text-sm">📍 {name}</p>
      )}
    </div>
  );
}
