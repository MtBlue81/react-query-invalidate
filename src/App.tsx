import { useState } from 'react'
import './App.css'
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
  InfiniteData,
} from '@tanstack/react-query'

const queryClient = new QueryClient()

type Todo = {
  id: number
  title: string
}
type PostTodo = {
  id: number
  title: string
  error?: boolean
}
type GetTodosParams = {
  pageParam: number
}
const getTodos = async (params: GetTodosParams): Promise<Todo[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let startId = params.pageParam;
      console.log('getTodos', params)
      resolve(Array.from({ length: 5 }, () => ({ id: startId, title: `Todo ${startId++}` })))
    }, 3000)})

}
const postTodo = async (todo: PostTodo) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('postTodo', todo)
      if (todo.error) {
       reject(new Error('An error occurred'));
      } else {
      resolve(todo);
      } 
    }, 3000)
  });
}

function App() {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <Todos />
    </QueryClientProvider>
  )
}

function Todos() {
  const [callCount, setCallCount] = useState(0)
  // Access the client
  const queryClient = useQueryClient()

  // Queries
  const query = useInfiniteQuery({
    queryKey: ['todos'],
    queryFn: (params: GetTodosParams) => {
      setCallCount(prev => prev + 1)
      return getTodos(params)
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.at(-1)!.id + 1
  })

  // Mutations
  // https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates#via-the-cache
  const mutation = useMutation({
    mutationFn: postTodo,
    onMutate: async (newTodo) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['todos'] })
  
      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData<InfiniteData<Todo[]>>(['todos'])
  
      // Optimistically update to the new value
      queryClient.setQueryData<InfiniteData<Todo[]>>(['todos'], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, pageIndex) => {
            return pageIndex === 0 ? [newTodo].concat(page) : page;
          })
        };
      })
  
      // Return a context object with the snapshotted value
      return { previousTodos }
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: (_err, _newTodo, context) => {
      if (context) {
        queryClient.setQueryData(['todos'], context.previousTodos)
      }
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  return (
    <div>
      <div style={{display: 'flex', flexDirection: 'column'}}>
        <div>Fetch call count: {callCount}</div>
        <button disabled={query.isFetching} onClick={() => query.fetchNextPage()}>next{query.isFetching && '...'}</button>
        <button
          disabled={mutation.isPending}
          onClick={() => {
            mutation.mutate({
              id: Date.now(),
              title: 'Do Laundry',
            })
          }}
        >
          Add Todo(success)
        </button>
        <button
          disabled={mutation.isPending}
          onClick={() => {
            mutation.mutate({
              id: Date.now(),
              title: 'Do Laundry(failure)',
              error: true,
            })
          }}
        >
          Add Todo(failure)
        </button>
      </div>
      <ul>{query.data?.pages.flatMap((todos) => todos.map((todo) => <li key={todo.id}>{todo.title}</li>))}</ul>
    </div>
  )
}

export default App
