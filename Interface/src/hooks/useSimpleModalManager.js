import { useReducer } from 'react';

const ensureModalExists = (state, modal) => {
  if (!state[modal]) {
    console.warn(`Modal "${modal}" does not exist in state.`);
    return false; // Indicate failure
  }
  return true; // Indicate success
};

const simpleModalReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_HANDLERS': {
      const { modal, handlers } = action.payload;
      if (!ensureModalExists(state, modal)) return state; // Guard
      return { ...state, [modal]: { ...state[modal], ...handlers } };
    }
    case 'SHOW_MODAL': {
      const { modal } = action.payload;
      if (!ensureModalExists(state, modal)) return state; // Guard
      return { ...state, [modal]: { ...state[modal], isOpen: true } };
    }
    case 'HIDE_MODAL': {
      const { modal } = action.payload;
      if (!ensureModalExists(state, modal)) return state; // Guard
      return { ...state, [modal]: { ...state[modal], isOpen: false } };
    }
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

const useSimpleModalManager = (initialState) => {
  const [modalState, modalDispatch] = useReducer(simpleModalReducer, initialState);

  const showModal = (modal) => modalDispatch({ type: 'SHOW_MODAL', payload: { modal } });
  const hideModal = (modal) => modalDispatch({ type: 'HIDE_MODAL', payload: { modal } });
  const addHandlers = (modal, handlers) => modalDispatch({ type: 'ADD_HANDLERS', payload: { modal, handlers } });

  return {
    modalState, showModal, hideModal, addHandlers,
  };
};

export default useSimpleModalManager;
