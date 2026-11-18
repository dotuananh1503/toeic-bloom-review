import { useEffect, useState } from 'react';
import { api } from './api';

export function useResource<T>(path: string) {
  const [state, setState] = useState<{ data?: T; error?: string; path: string }>({ path:'' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    if (path) api<T>(path,{signal:controller.signal}).then(data => setState({data,path})).catch(error => {
      if (!controller.signal.aborted) setState({path,error:error.message});
    });
    return () => controller.abort();
  },[path,version]);
  return { data:state.path === path ? state.data : undefined, error:state.path === path ? state.error : undefined,
    refresh:() => setVersion(value => value + 1) };
}
