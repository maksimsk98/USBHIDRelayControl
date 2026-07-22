import { createAsyncThunk } from '@reduxjs/toolkit';
import { selectFreezePending } from '../../reduxImportDispatcher';

export const waitForFreezeDone = createAsyncThunk(
  'report/waitForFreezeDone',
  async (parentId, { getState }) => {
    const MAX_RETRIES = 100;
    let tries = 0;

    while (true) {
      const pending = selectFreezePending(getState(), parentId);

      if (pending === 0) {
        console.log(
          `[freeze-wait] done after ${tries} frame(s), parentId=${parentId}`,
        );
        return { ok: true, tries };
      }

      tries += 1;

      /*       console.log(
        `[freeze-wait] retry ${tries}/${MAX_RETRIES}, pending=${pending}, parentId=${parentId}`
      ); */

      if (tries >= MAX_RETRIES) {
        console.warn(
          `[freeze-wait] GIVE UP after ${tries} frame(s), pending=${pending}, parentId=${parentId}`,
        );
        return { ok: false, tries, pending };
      }

      await new Promise(requestAnimationFrame);
    }
  },
);
