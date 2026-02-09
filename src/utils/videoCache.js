import {LRUCache} from "lru-cache";

export const videoCache = new LRUCache({
  max: 500,                 
  ttl: 1000 * 60 * 5 
});
