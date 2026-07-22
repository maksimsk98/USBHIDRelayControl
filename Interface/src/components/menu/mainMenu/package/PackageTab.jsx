import {
  useCallback,
  useEffect, useMemo, useRef, useState,
} from 'react';
import { Col, Row } from 'react-bootstrap';

import { useDispatch, useSelector } from 'react-redux';
import { Allotment } from 'allotment';
import _, { isArray } from 'lodash';
import ChooseRootButton from './ChooseRootButton.jsx';
import FolderAccessGate from './RootAccessGate.jsx';
import { useTreeFromHandle } from '../../../../hooks/useTreeFromHandle.js';
import FileExplorerRcTree from './FileExplorerRcTree.jsx';
import { openFromHandle } from '../../../../services/thunks/file/fileUploadThunk.js';
import IndexedFileList from './IndexedFilesList.jsx';
import {
  makeSelectChromaPlotsByIds, selectIndexedFilesByPackage, selectIsSavingPackageOnClose, selectPreviewFilesIdsByPackage, selectRootPath, selectUniqueYLabelsByIds,
  packageActions,
} from '../../../../services/reduxImportDispatcher.js';
import { FILE_ID_CATEGORIES } from '../../../../constants/constants.js';

import GeneralPlot from './GeneralPlots.jsx';
import ViewSettingsPanel from './ViewControl.jsx';
import ChromatogramOptionsOverlay from '../../../chromotograph/peaks/ChromatogramOptionsOverlay.jsx';
import {
  checkFileEntry, indexPreview, deindexPreview, unlinkFileFromCategory,
} from '../../../../services/thunks/file/fileThunks.js';
import CustomCheckboxGroup from '../../../custom/CustomCheckboxGroup.jsx';

import PeaksTable from './PeaksTable.jsx';
import FileExplorerRct from './FileRCTExplorer.jsx';

const formatIndexedFiles = (indexedFiles) => {
  if (!indexedFiles || !isArray(indexedFiles)) return [];
  return indexedFiles.map((file, index) => ({
    fileId: file.id,
    name: file.name,
    isDisplayed: true,
  }));
};

export default function PackageTab(props) {
  const packageId = props.api.id;
  const dispatch = useDispatch();
  const [rootHandle, setRootHandle] = useState(null);
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]); // must be array for downsteam logic
  const [selectedIndexedFileId, setSelectedIndexedFileId] = useState(null);
  const [shiftY, setShiftY] = useState(10);
  const [timeUnit, setTimeUnit] = useState('min');

  const storedSavePackageOnClose = useSelector(selectIsSavingPackageOnClose);
  const [isSavingPackageOnClose, setIsSavingPackageOnClose] = useState(storedSavePackageOnClose);

  useEffect(() => { setIsSavingPackageOnClose(storedSavePackageOnClose); }, [storedSavePackageOnClose]);

  const previewId = useSelector((state) => selectPreviewFilesIdsByPackage(state, packageId))?.[0] ?? null;

  const packageFiles = useSelector((state) => selectIndexedFilesByPackage(state, packageId));
  const rootPath = useSelector(selectRootPath);

  const [indexedElems, setIndexedElems] = useState(() => formatIndexedFiles(packageFiles));

  useEffect(() => {
    setIndexedElems((prev) => {
      const prevMap = new Map(prev.map((e) => [e.fileId, e.isDisplayed]));
      return formatIndexedFiles(packageFiles).map((newElem) => ({
        ...newElem,
        isDisplayed: prevMap.get(newElem.fileId) ?? newElem.isDisplayed,
      }));
    });
  }, [packageFiles]);

  const changeIndexedIsDisplayed = (bool, index) => {
    setIndexedElems((prev) => {
      const newState = [...prev];
      if (bool == null) {
        if (prev[index]?.isDisplayed !== undefined) newState[index].isDisplayed = !prev[index].isDisplayed;
        return newState;
      } // toggle by default
      newState[index].isDisplayed = bool; // explicit set
      return newState;
    });
  };

  const activeFileIndex = useMemo(
    () => packageFiles.findIndex((file) => file.id === selectedIndexedFileId),
    [packageFiles, selectedIndexedFileId],
  );



  const handleSelectedIndexedFileIdChange = useCallback((args) => {
    if (packageId && previewId) dispatch(deindexPreview({ packageId, fileId: previewId }));
    setSelectedIndexedFileId(args)
  }, [packageId, previewId]) 

  const { packageFilesIds, displayedMap, indexedDisplayedIds } = useMemo(() => {
    const packageFilesIds = indexedElems.map((elem) => elem.fileId);

    // include previewId fo display here, but remove from plot order, preview has own trace style
    const indexedDisplayedIds = [
      ...indexedElems.filter((elem) => elem.isDisplayed).map((elem) => elem.fileId),
      ...(previewId ? [previewId] : []),
    ];

    // this maps ids to order index for traces relation
    const displayedMap = indexedElems.reduce((acc, elem, index) => {
      if (elem.isDisplayed) {
        acc[elem.fileId] = index;
      }
      return acc;
    }, {});

    return { packageFilesIds, displayedMap, indexedDisplayedIds };
  }, [indexedElems, previewId]);

  const yLabelsForDetectors = useSelector((state) => selectUniqueYLabelsByIds(state, indexedDisplayedIds));

  const prevIndexedRef = useRef([]);
  useEffect(() => {
    const prev = prevIndexedRef.current;
    const curr = indexedElems;

    const removed = _.differenceBy(prev, curr, 'fileId'); // entries removed
    const added = _.differenceBy(curr, prev, 'fileId'); // entries added

    if (removed.length > 0) {
      const removedId = removed[0].fileId; // assuming only 1 at a time

      for (const [relPath, id] of relPathToIdMap.current.entries()) {
        if (id === removedId) {
          setCheckedKeys((prev) => prev.filter((key) => key !== relPath));
          relPathToIdMap.current.delete(relPath);
          break;
        }
      }

      const removedIndex = prev.findIndex((elem) => elem.fileId === removedId);

      const newSelectedIndex = removedIndex > 0
        ? removedIndex - 1
        : curr.length > 0
          ? 0
          : null;

      if (newSelectedIndex !== null) {
        setSelectedIndexedFileId(curr[newSelectedIndex].fileId);
      } else {
        setSelectedIndexedFileId(null); // All gone
      }
    } else if (added.length > 0) {
      setSelectedIndexedFileId(added[0].fileId); // The newly added one
    }

    prevIndexedRef.current = indexedElems;
  }, [indexedElems]);

  const plotsByIdsSelector = useMemo(makeSelectChromaPlotsByIds, []);

  const PACKAGE_SHOWN_PLOT_TYPE = 'calculatedChromatogram';
  const chromaPlotsByIds = useSelector((state) => plotsByIdsSelector(state, indexedDisplayedIds, PACKAGE_SHOWN_PLOT_TYPE));

  // tree builds only if handle present
  const {
    tree, handleMap, getHandle, status, error,
  } = useTreeFromHandle(rootHandle);

  const [orientation, setOrientation] = useState('vertical');
  const [namingMode, setNamingMode] = useState('index');

  const annotationsConfig = useMemo(() => ({
    useAnnotations: true,
    orientation,
    namingMode,
  }), [orientation, namingMode]);

  const relPathToIdMap = useRef(new Map());

  useEffect(() => {
    relPathToIdMap.current.clear();
  }, [rootHandle]);

  const handleIndexFile = async (delta, all, setter) => {
    const { relPath, checked } = delta;

    if (checked) {
      const { uploaded, registeredRepeats, rejectedFiles } = await dispatch(openFromHandle({
        inputHandle: delta.handle,
        meta: {
          packageId,
          category: FILE_ID_CATEGORIES.PACKAGE,
          relPath,
          initiator: 'packageIndexing',
        },
        config: { shouldOpen: false },
      })).unwrap();

      const fileId = uploaded?.[0]?.resolverKey ?? registeredRepeats?.[0];
      if (fileId) {
        relPathToIdMap.current.set(relPath, fileId);
      }

      if (rejectedFiles.length && !uploaded.length && !registeredRepeats.length) {
        setter((prev) => prev.filter((path) => path !== relPath));
      }
    } else {
      const fileId = relPathToIdMap.current.get(relPath);
      if (fileId) {
        dispatch(unlinkFileFromCategory({ indexer: packageId, fileId, category: FILE_ID_CATEGORIES.PACKAGE }));
        relPathToIdMap.current.delete(relPath); // Clean up
      }
    }
  };

  const handleFirstPreviewOpen = async (fileData) => {
    const { relPath, handle } = fileData;
    const { uploaded, registeredRepeats } = await dispatch(openFromHandle({
      inputHandle: handle,
      meta: {
        packageId,
        category: FILE_ID_CATEGORIES.PREVIEW,
        relPath,
        initiator: 'previewOpen',
      },
      config: { shouldOpen: false },
    })).unwrap();

    const previewId = uploaded?.[0]?.resolverKey ?? registeredRepeats?.[0];
    /* console.log('preMap', previewId); */
    if (previewId) {
      relPathToIdMap.current.set(relPath, previewId);
    }
    return previewId;
  };

  const handleFileClick = async (relPath) => {
    const fileData = { relPath, handle: getHandle(relPath) };
    const expectedIdRelPath = relPathToIdMap.current.get(relPath);
    let newPreviewId;
    const idIsPredicted = relPathToIdMap.current.has(relPath);
    let alreadyCached = false;

    if (!idIsPredicted) {
      // preview load
      newPreviewId = await handleFirstPreviewOpen(fileData);
    } else {
      const { isPresent } = await dispatch(checkFileEntry({ fileId: expectedIdRelPath, presentCheckOnly: true })).unwrap();
      if (isPresent) {
        newPreviewId = expectedIdRelPath;
        alreadyCached = true;
      } else newPreviewId = await handleFirstPreviewOpen(fileData);
    }

    if (idIsPredicted && newPreviewId !== expectedIdRelPath) {
      console.error('File ID changed with the same relPath');
    }

    if (alreadyCached) {
      // Manually relink cached
      dispatch(indexPreview({ packageId, fileId: newPreviewId }));
    }

    if (newPreviewId && previewId && newPreviewId !== previewId) {
      dispatch(deindexPreview({ packageId, fileId: previewId }));
    }
  };

  const handleBgClick = () => {
    if (previewId) {
      dispatch(deindexPreview({ packageId, fileId: previewId }));
      setSelectedKeys([]);
    }
  };

  /* const allFiles = useSelector(selectAllFiles)

  useEffLog({allFiles}) */

  const handleSaveCheckbox = (e) => dispatch(packageActions.setIsSavingPackageOnClose(e.target.checked));

  const chooseRootButtonRef = useRef(null);

  return (
    <Allotment vertical>
      <Allotment.Pane preferredSize={180}>
        <div className="p-1" style={{ height: '100%', overflow: 'auto' }}>
          <Row className="flex-wrap">
            <Col style={{ width: 'fit-content', height: '100%' }} className="mb-2">
              <IndexedFileList
                packageId={packageId}
                setSelectedIndexedFile={handleSelectedIndexedFileIdChange}
                indexedElems={indexedElems}
                changeIsDisplayed={changeIndexedIsDisplayed}
                activeElemIndex={activeFileIndex}
              />
            </Col>
            <Col className="mb-2">
              <PeaksTable
                timeUnit={timeUnit}
                parentId={previewId ?? selectedIndexedFileId}
              />
            </Col>
            <Col xs="auto" className="mb-2">
              <ViewSettingsPanel
                shiftY={shiftY}
                setShiftY={setShiftY}
                timeUnit={timeUnit}
                setTimeUnit={setTimeUnit}
                siblings={(
                  <ChromatogramOptionsOverlay
                    setOrientation={setOrientation}
                    setNamingMode={setNamingMode}
                    label="Настройки меток пиков"
                  />
                )}
              />
            </Col>
          </Row>
        </div>

      </Allotment.Pane>
      <Allotment.Pane minSize={200}>
        <Allotment>
          <Allotment.Pane minSize={260} preferredSize="25%">
            <div className="d-flex flex-column w-100 h-100 p-1">
              {/* Top controls */}
              <div className="d-flex flex-wrap w-100 gap-1 mb-2">
                <ChooseRootButton ref={chooseRootButtonRef} onRootHandle={setRootHandle} />
                <CustomCheckboxGroup
                  label="Сохранять пакет"
                  labelStyle={{ width: 'fit-content' }}
                  onChange={handleSaveCheckbox}
                  checked={isSavingPackageOnClose}
                  groupClassName="mb-0"
                />
              </div>

              {rootPath && (
                <div
                  className="text-truncate small text-secondary mb-1 px-1"
                  title={rootPath}
                  style={{
                    minHeight: 24,          // ensures div is never crumpled vertically
                    maxWidth: 'calc(100% - 8px)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    textOverflow: 'ellipsis',
                  }}
                  onClick={() => chooseRootButtonRef.current?.click?.()}
                >
                  📁 {rootPath}
                </div>
              )}

              <FolderAccessGate onReady={setRootHandle} />

              {/* Tree container: flex 1 + scroll */}
              <div className="flex-grow-1 mt-1" style={{ overflow: 'auto' }}>
                {status === 'idle' && <div>Нет выбранной папки.</div>}
                {status === 'building' && <div>Строю дерево…</div>}
                {status === 'error' && <div>Ошибка: {String(error?.message || error)}</div>}
                {status === 'ready' && (
                  <FileExplorerRct
                    getHandle={getHandle}
                    checkedKeys={checkedKeys}
                    setCheckedKeys={setCheckedKeys}
                    selectedKeys={selectedKeys}
                    setSelectedKeys={setSelectedKeys}
                    tree={tree}
                    handleMap={handleMap}
                    onCheckedChange={handleIndexFile}
                    onNameClick={handleFileClick}
                    onNameDoubleClick={async (rel) => {
                      const inputHandle = getHandle(rel);
                      await dispatch(openFromHandle({
                        inputHandle: inputHandle,
                        meta: {
                          packageId: null,
                          category: FILE_ID_CATEGORIES.OPENED,
                          relPath: rel,
                          initiator: 'directOpen',
                        },
                        config: { shouldOpen: true },
                      }));
                    }}
                    onBackgroundClick={handleBgClick}
                    rootless={true}
                    rootLabel={null}
                    style={{ width: '100%', height: '100%' }} // fill flex container
                  />
                )}
              </div>
            </div>
          </Allotment.Pane>

          <Allotment.Pane minSize={260}>
            <GeneralPlot
              packageId={packageId}
              plotsByIds={chromaPlotsByIds}
              displayedMap={displayedMap}
              highlightedId={selectedIndexedFileId}
              activeFileIndex={activeFileIndex}
              timeUnit={timeUnit}
              shift={{ mode: '%', shiftY }}
              annotationsConfig={annotationsConfig}
              yLabelsForDetectors={yLabelsForDetectors}
            />
          </Allotment.Pane>
        </Allotment>
      </Allotment.Pane>
    </Allotment>
  );
}
