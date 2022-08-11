import { ChannelItem } from '@mediahubmx/sdk';
import fetch from 'node-fetch';
import { format as formatUrl, parse as parseUrl } from 'url';

const apiUrl = 'https://images-api.nasa.gov';

class NasaApi {
  async getVideos({ search = '', filter = {}, cursor }) {
    const page = cursor === null ? 1 : <number>cursor;
    return await this.get('search', {
      ...filter,
      q: search,
      media_type: 'video',
      page,
    }).then(({ collection: data }) => {
      const items = Array.from(data.items || []).map<ChannelItem>((item: any) =>
        this.convertChannel(item)
      );
      return {
        nextCursor:
          Array.from(data.links || []).findIndex((it: any) => it.rel === 'next') >= 0
            ? page + 1
            : null,
        items,
        features: {
          filter: [],
        },
      };
    });
  }

  async getVideo({ ids }) {
    const id = ids.id;
    return await this.get('search', {
      nasa_id: id,
    }).then(({ collection: data }) => {
      const items = Array.from(data.items || []).map<ChannelItem>((item: any) =>
        this.convertChannel(item)
      );
      return items[0];
    });
  }

  convertChannel(item: any): ChannelItem {
    let { data, links } = item;
    data = data[0];
    const preview = links.find(it => it.rel === 'preview');
    const caption = links.find(it => it.rel === 'captions');

    const channel: ChannelItem = {
      id: data.nasa_id,
      type: 'channel',
      ids: { id: data.nasa_id },
      name: data.title,
      description: data.description,
      releaseDate: data.date_created,
      images: {
        poster: preview.href || undefined,
      },
      sources: [],
    };
    if (preview && preview.href) {
      channel.sources?.push({
        id: data.nasa_id,
        name: data.title,
        type: 'url',
        url: String(preview.href).replace('~thumb.jpg', '~orig.mp4'),
      });
    }
    return channel;
  }

  async get(pathname = '', query = {}, options = {}) {
    return this.api({ pathname, query }, options);
  }

  async post(pathname, data = {}, query = {}, options = {}) {
    return this.api(
      { pathname, query },
      {
        ...options,
        method: 'post',
        body: data,
      }
    );
  }

  async put(pathname, data = {}, query = {}, options = {}) {
    return this.api(
      { pathname, query },
      {
        ...options,
        method: 'put',
        body: data,
      }
    );
  }

  async delete(pathname, query = {}, options = {}) {
    return this.api(
      { pathname, query },
      {
        ...options,
        method: 'delete',
      }
    );
  }

  async api(url, options: any = {}) {
    let { body, headers = {} } = options;
    //const apiKey = process.env.NASA_API_KEY;
    headers = {
      //'Content-Type': 'application/json',
      ...headers,
    };
    if (body && typeof body === 'object') {
      if (headers['Content-Type'] === 'application/json') {
        body = this.handleBodyAsJson(body);
      } else if (headers['Content-Type'] === 'application/x-www-form-urlencoded') {
        body = this.handleBodyAsFormUrlencoded(body);
      }
    }
    let opts = { ...options, body, headers };
    const apiUrl = this.apiUrl(url);
    const res = await fetch(apiUrl, opts);
    return this.handleResponse(res);
  }

  apiUrl(url: any = {}) {
    let { pathname, query = {}, ...other } = url;
    let parsedApiUrl = parseUrl(apiUrl);
    if (String(pathname).startsWith('http')) {
      parsedApiUrl = parseUrl(pathname);
      pathname = parsedApiUrl.pathname;
    }
    return formatUrl({
      ...parsedApiUrl,
      pathname,
      query,
      ...other,
    });
  }

  async handleResponse(res) {
    const contentType = res.headers.get('content-type') || 'text';
    if (contentType.includes('json')) {
      return this.handleResponseAsJson(res);
    }
    return this.handleResponseAsText(res);
  }

  handleBodyAsJson(data = {}) {
    return JSON.stringify(data);
  }

  handleBodyAsFormUrlencoded(body) {
    return Object.entries(body)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) =>
        Array.isArray(value) ? value.map(item => `${key}=${item}`).join('&') : `${key}=${value}`
      )
      .join('&');
  }

  async handleResponseAsJson(res) {
    if (res.status >= 400) {
      const error = await res.json();
      throw error;
    }
    if (res.status === 204) {
      return null;
    }
    let data = await res.json();
    data = typeof data === 'string' ? JSON.parse(data) : data;
    return data;
  }

  async handleResponseAsText(res) {
    if (res.status >= 400) {
      const error = await res.text();
      throw error;
    }
    if (res.status === 204) {
      return null;
    }
    const data = await res.text();
    return data;
  }
}

const client = new NasaApi();

export default client;
