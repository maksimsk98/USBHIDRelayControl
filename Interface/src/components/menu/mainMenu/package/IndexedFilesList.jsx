import {
  useCallback,
  useEffect,
} from 'react';
import { useDispatch } from 'react-redux';
import { useLineStyleGenerator } from '../../../../utils/plotUtils';
import { useContextMenu } from '../../../../hooks/useCustomContextMenu';
import { unlinkFileFromCategory } from '../../../../services/thunks/file/fileThunks';
import { FILE_ID_CATEGORIES } from '../../../../constants/constants';
import IndexedTraceList from '../../../custom/CustomIndexedTraceList';

function IndexedFileList({
  indexedElems, setSelectedIndexedFile,
  style, activeElemIndex, changeIsDisplayed,
  packageId,
}) {
  const dispatch = useDispatch();

  const onCheckChange = (e, index) => {
    changeIsDisplayed(e.target.checked, index);
    e.stopPropagation();
  };

  const onItemClick = (e, elemIndex, item) => {
    setSelectedIndexedFile(item.fileId);
  };

  const getLineStyle = useLineStyleGenerator();
  const stableGetLineStyle = useCallback(getLineStyle, []);

  const getItemStyle = useCallback((index) => stableGetLineStyle({ index, selectedIndex: activeElemIndex }), [stableGetLineStyle, activeElemIndex]);

  const unlinkElem = (e, context) => {
    const fileId = context?.elem?.fileId;
    if (!fileId || !packageId) return console.warn(`Not enough context! packageId: ${packageId}, fileId: ${fileId}`);
    dispatch(unlinkFileFromCategory({ indexer: packageId, fileId, category: FILE_ID_CATEGORIES.PACKAGE }));
  };

  const {
    onContextMenu,
    ContextMenu,
  } = useContextMenu({
    schema: [
      {
        type: 'item',
        label: 'Удалить',
        action: unlinkElem,
      },
    ],
  });

  const onItemContextMenu = (e, item, itemIndex) => {
    onContextMenu(e, { elem: item, elemIndex: itemIndex });
  };

  return (
    <IndexedTraceList
      items={indexedElems}
      onItemClick={onItemClick}
      onCheckChange={onCheckChange}
      onItemContextMenu={onItemContextMenu}
      getItemStyle={getItemStyle}
      activeIndex={activeElemIndex}
      contextMenu={ContextMenu}
    />
  );
}

export default IndexedFileList;
