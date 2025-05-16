import { useState } from "react";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  type MapMouseEvent
} from "@vis.gl/react-google-maps";
import { Ubication } from "@/interfaces/interfaces";

type LocationSelectorProps = {
  onLocationChange: (loc: Ubication) => void;
};

export function LocationSelector({ onLocationChange }: LocationSelectorProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapDrag = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

      onLocationChange({ lat, lng, name: null });
      setPosition({ lat, lng });
      console.log("Ubicación seleccionada:", lat, lng);
    }
  };

  const handleMapClick = (e: MapMouseEvent) => {
    if (e.detail.latLng) {
      const { lat, lng } = e.detail.latLng;
      onLocationChange({ lat, lng, name: null });
      setPosition({ lat, lng });
      console.log("Ubicación seleccionada:", lat, lng);
    }
  };

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultZoom={14}
        defaultCenter={{ lat: 40.8124970852596, lng: 0.5212677564206379 }}
        style={{ width: "100%", height: "300px" }}
        onClick={handleMapClick}
        mapId={"e281a4f58cc63ae81dedfb32"}
      >
        {position && (
          <AdvancedMarker draggable={true} onDragEnd={(e) => handleMapDrag(e)} onDrag={() => console.log("Dragging map")} clickable={true} onClick={() => {onLocationChange({ lat: null, lng: null, name: null }); setPosition(null)}} position={position} title={"Ubicació de la prova"} collisionBehavior="OPTIONAL_AND_HIDES_LOWER_PRIORITY">
                <Pin background={'#ea4335'} glyphColor={'#b31412'} borderColor={'#b31412'}  />
          </AdvancedMarker>
        )}
      </Map>
    </APIProvider>
  );
}