import { useDispatch } from 'react-redux';

import IndexedTraceList from '../../custom/CustomIndexedTraceList';

import { useContextMenu } from '../../../hooks/useCustomContextMenu';
import { deleteSpectroCurve } from '../../../services/thunks/spectroPlots/spectroPlotsThunks';
import { indexToLetters } from '../../../utils/indexes';

function SpectroTracesList({
  displayedTraces, changeIsDisplayed,
  tabId, getItemStyle,
}) {
  const dispatch = useDispatch();

  const onCheckChange = (e, index) => {
    changeIsDisplayed(index);
    e.stopPropagation();
  };

  const deleteTrace = (e, { itemIndex }) => {
    dispatch(deleteSpectroCurve({ tabId, traceIndex: itemIndex }));
    console.log(`Deleting trace ${itemIndex} from displayed traces of ${tabId}`);
  };

  const {
    onContextMenu,
    ContextMenu,
  } = useContextMenu({
    schema: [
      {
        type: 'item',
        label: 'Удалить',
        action: deleteTrace,
      },
    ],
  });

  const onItemContextMenu = (e, item, itemIndex) => {
    onContextMenu(e, { item, itemIndex });
  };

  const enrichedTraces = displayedTraces.map((item, i) => ({
    ...item,
    letterIndex: indexToLetters(i),
  }));

  return (
    <IndexedTraceList
      items={enrichedTraces}
      onCheckChange={onCheckChange}
      onItemContextMenu={onItemContextMenu}
      getItemStyle={getItemStyle}
            /* activeIndex={activeElemIndex} */
      contextMenu={ContextMenu}
      containerStyle={{ height: '100%', width: 'auto' }}
    />
  );
}

export default SpectroTracesList;
