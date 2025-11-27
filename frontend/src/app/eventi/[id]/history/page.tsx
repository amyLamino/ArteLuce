// extrait clé à vérifier
import DiffPanel from "./DiffPanel";
import SnapCompare from "./SnapCompare";
// … après avoir listé les réfs:
<DiffPanel id={params.id} prevRef={selectedPrevRef} curRef={selectedCurRef} />
<SnapCompare id={params.id} prevRef={selectedPrevRef} curRef={selectedCurRef} />
