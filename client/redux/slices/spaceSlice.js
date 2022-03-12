import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import fetchSpaceEverything from '../../utils/requests/everythingRequests';
import { createFolder } from '../../utils/requests/folderRequests';
import { createList } from '../../utils/requests/listRequests';
import { createSpace } from '../../utils/requests/spaceRequests';
import { createTask } from '../../utils/requests/taskRequests';
import sanitizeTask from '../../utils/taskAlgorithms/sanitizeTasks';

/*
 * In the space slice we only store the spaces of the currently active workspace.
 * spaceData => stores Id of all spaces and their children
 *    spaceId: String, spaceName: String, children: [{childType: String, childId: String}]
 *    spaceMeta: (Meta data for spaces - color, icon, statuses, views)
 * folderData => stores Id of all folders and its children
 *    folderId: String, folderName: String, children: [{childType: String, childId: String}]
 * listData => stores Id of all lists and the tasks in them
 *    listId: String, listName: String, tasks: [String]
 * activeItem => stores Id of currently active item
 */
const initialState = {
  spaceData: [],
  folderData: [],
  listData: [],
  taskData: [],
  activeItem: '',
  activeItemName: '',
  error: '',
};

/* eslint-disable no-underscore-dangle */
export const getSpaceDataAsync = createAsyncThunk(
  'space/getData',
  async ({
    spaces, workspaceId, userId, token,
  }, thunkApi) => {
    try {
      const combinedData = await Promise.all(spaces.map(space => fetchSpaceEverything(space, workspaceId, userId, token)));
      const meta = thunkApi.getState().metaReducer;

      combinedData.map((spaceData, idx) => {
        combinedData[idx].task = sanitizeTask(spaceData.task, meta.priorities, meta.statuses);
      });

      return thunkApi.fulfillWithValue({ spaceData: combinedData });
    } catch (error) {
      return thunkApi.rejectWithValue({ error: error.message });
    }
  },
);

export const createSpaceAsync = createAsyncThunk(
  'space/createSpace',
  async ({
    spaceName, workspaceId, userId, token,
  }, thunkApi) => {
    try {
      const { data } = await createSpace(spaceName, workspaceId, userId, token);

      if (data.success === false) {
        return thunkApi.rejectWithValue({ error: data.error });
      }

      return { data };
    } catch (error) {
      return thunkApi.rejectWithValue({ error: error.message });
    }
  },
);

export const createFolderAsync = createAsyncThunk(
  'space/createFolder',
  async ({
    folderName, parentType, parentId, userId, token,
  }, thunkApi) => {
    try {
      const { data } = await createFolder(folderName, parentType, parentId, userId, token);

      if (data.success === false) {
        return thunkApi.rejectWithValue({ error: data.error });
      }

      return { data };
    } catch (error) {
      return thunkApi.rejectWithValue({ error: error.message });
    }
  },
);

export const createListAsync = createAsyncThunk(
  'space/createList',
  async ({
    listName, parentType, parentId, userId, token,
  }, thunkApi) => {
    try {
      const { data } = await createList(listName, parentType, parentId, userId, token);

      if (data.success === false) {
        return thunkApi.rejectWithValue({ error: data.error });
      }

      return { data };
    } catch (error) {
      return thunkApi.rejectWithValue({ error: error.message });
    }
  },
);

export const createTaskAsync = createAsyncThunk(
  'space/createTask',
  async ({
    taskName, taskMeta, parentType, parentId, userId, token,
  }, thunkApi) => {
    try {
      const { data } = await createTask(taskName, taskMeta, parentType, parentId, userId, token);

      if (data.success === false) {
        return thunkApi.rejectWithValue({ error: data.error });
      }

      const { priorities, statuses } = thunkApi.getState().metaReducer;
      const task = sanitizeTask([data.task], priorities, statuses)[0];

      return { data: { success: true, task } };
    } catch (error) {
      return thunkApi.rejectWithValue({ error: error.message });
    }
  },
);

/* eslint-disable no-param-reassign */
function assignSpaceData(state, action) {
  const spaceData = action?.payload?.spaceData;

  spaceData.forEach(spaceItem => {

    spaceItem.space.forEach((item) => {
      if (!state.spaceData.includes(item)) state.spaceData.push(item);
    });

    spaceItem.folder.forEach((item) => {
      if (!state.folderData.includes(item)) state.folderData.push(item);
    });

    spaceItem.list.forEach((item) => {
      if (!state.listData.includes(item)) state.listData.push(item);
    });

    spaceItem.task.forEach((item) => {
      if (!state.taskData.includes(item)) state.taskData.push(item);
    });
  })
}

function setActiveItem(state, action) {
  state.activeItem = action.payload.id;
}

function attachNewSpace(state, action) {
  state.spaceData.push(action.payload.data.space);
}

function attachNewFolder(state, action) {
  const folder = action.payload?.data?.folder;

  // Add this folder to the list of all folders.
  state.folderData.push(folder);

  // Update this folder data in the parent.
  const { parentId } = folder.parent;
  const parentType = folder.parent.parentType.toLowerCase();

  let parentData;
  if (parentType === 'space') {
    parentData = state.spaceData;
  } else if (parentType === 'folder') {
    parentData = state.folderData;
  } else if (parentType === 'list') {
    parentData = state.listData;
  }

  // Add the new folder to the parent's children list.
  for (let i = 0; i < parentData.length; i += 1) {
    if (parentData[i]._id === parentId) {
      parentData[i].children.push({
        childType: 'FOLDER',
        id: folder._id,
        _id: folder._id,
      });
      break;
    }
  }
}

function attachNewList(state, action) {
  const { list } = action.payload.data;

  state.listData.push(list);

  // Update this folder data in the parent.
  const { parentId } = list.parent;
  const parentType = list.parent.parentType.toLowerCase();

  let parentData;
  if (parentType === 'space') {
    parentData = state.spaceData;
  } else if (parentType === 'folder') {
    parentData = state.folderData;
  } else if (parentType === 'list') {
    parentData = state.listData;
  }

  // Add the new folder to the parent's children list.
  for (let i = 0; i < parentData.length; i += 1) {
    if (parentData[i]._id === parentId) {
      parentData[i].children.push({
        childType: 'LIST',
        id: list._id,
        _id: list._id,
      });
      break;
    }
  }
}

function attachNewTask(state, action) {
  const task = action?.payload?.data?.task;

  state.taskData.push(task);

  // Update this folder data in the parent.
  const { parentId } = task.parent;

  let parentData;
  parentData = state.listData;

  // Add the new task to the parent's children list.
  for (let i = 0; i < parentData.length; i += 1) {
    if (parentData[i]._id === parentId) {
      parentData[i].children.push({
        childType: 'TASK',
        id: task._id,
        _id: task._id,
      });
      break;
    }
  }
}

function setError(state, action) {
  state.error = action.payload.error;
}

function resetSliceToDefault() {
  return initialState;
}
/* eslint-enable no-param-reassign */

export const spaceSlice = createSlice({
  name: 'space',
  initialState,
  reducers: {
    setActive: setActiveItem,
    resetSlice: resetSliceToDefault,
  },
  extraReducers: {
    [getSpaceDataAsync.fulfilled]: assignSpaceData,
    [getSpaceDataAsync.rejected]: setError,
    [createSpaceAsync.fulfilled]: attachNewSpace,
    [createSpaceAsync.rejected]: setError,
    [createFolderAsync.fulfilled]: attachNewFolder,
    [createFolderAsync.rejected]: setError,
    [createListAsync.fulfilled]: attachNewList,
    [createListAsync.rejected]: setError,
    [createTaskAsync.fulfilled]: attachNewTask,
    [createTaskAsync.rejected]: setError,

  },
});

export const { setActive, resetSlice } = spaceSlice.actions;

export default spaceSlice.reducer;
