import { useExperienceStore } from "../stores/experience.js";
import "./info-button.css";

const InfoButton = () => {
  const isInfoPanelOpen = useExperienceStore((state) => state.isInfoPanelOpen);
  const setIsInfoPanelOpen = useExperienceStore(
    (state) => state.setIsInfoPanelOpen,
  );

  return (
    <button
      id="info-button"
      onClick={() => setIsInfoPanelOpen(!isInfoPanelOpen)}
    >
      {isInfoPanelOpen ? "Close" : "Info"}
    </button>
  );
};

export default InfoButton;
