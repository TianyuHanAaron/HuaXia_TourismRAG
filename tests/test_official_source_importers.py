from huaxia_tourismrag.indexing.official_source_importers import (
    FirecrawlCuisineExtractor,
    merge_rows_by_name_province_source,
    parse_mct_intangible_food_route_html,
    parse_moa_agricultural_gi_notice_html,
    parse_state_council_heritage_tables_html,
)


def test_parse_state_council_heritage_tables_html_extracts_rows():
    html = """
    <table>
      <tr><td>序号</td><td>编号</td><td>名称</td><td>时代</td><td>地址</td></tr>
      <tr><td>1</td><td>8-0001-1-001</td><td>上宅遗址</td><td>新石器时代</td><td>北京市平谷区</td></tr>
      <tr><td>2</td><td>8-0002-1-002</td><td>郛堤城遗址</td><td>战国、秦汉</td><td>河北省黄骅市</td></tr>
    </table>
    """

    rows = parse_state_council_heritage_tables_html(
        html,
        source_url="https://www.forestry.gov.cn/example.html",
    )

    assert len(rows) == 2
    assert rows[0]["name"] == "上宅遗址"
    assert rows[0]["province"] == "北京市"
    assert rows[0]["city"] == "北京市"
    assert rows[0]["tags"][:3] == ["全国重点文物保护单位", "文保", "历史人文"]
    assert rows[1]["province"] == "河北省"


def test_parse_moa_agricultural_gi_notice_html_extracts_rows():
    html = """
    <p>2017年第三批农产品地理标志登记产品公告信息</p>
    <p>序号</p><p>产品名称</p><p>所在地域</p><p>申请人全称</p><p>质量控制技术规范编号</p>
    <p>1</p><p>北京鸭</p><p>北京</p><p>北京市畜牧总站</p><p>AGI2017-03-2119</p>
    <p>2</p><p>南宫黄韭</p><p>河北</p><p>南宫市农业技术推广中心</p><p>AGI2017-03-2120</p>
    """

    rows = parse_moa_agricultural_gi_notice_html(
        html,
        source_url="https://www.moa.gov.cn/example.htm",
    )

    assert [row["name"] for row in rows] == ["北京鸭", "南宫黄韭"]
    assert rows[0]["province"] == "北京市"
    assert rows[1]["province"] == "河北省"
    assert rows[0]["level"] == "agricultural_gi"


def test_parse_mct_intangible_food_route_html_extracts_real_food_items():
    html = """
    <html>
      <body>
        <div>广东省丨寻味顺德非遗美食之旅</div>
        <p>行程节点</p>
        <p>顺德区博物馆→顺德美食博物馆→双皮奶文化展示馆</p>
        <p>非遗美食技艺及特色项目</p>
        <p>奶制品制作技艺（双皮奶制作技艺）、伦教糕制作技艺、牛乳制作技艺（顺德大良）、顺德鱼生制作技艺、香云纱染整技艺</p>
        <p>游客可寻觅大良牛乳等小吃；再到羊额古村，品尝羊额烧鹅、龟苓膏，美景美食相得益彰。</p>
      </body>
    </html>
    """

    rows = parse_mct_intangible_food_route_html(
        html,
        source_url="https://zhuanti.mct.gov.cn/fymstslvxlzs/xl_detail/9694.html",
    )

    names = [row["name"] for row in rows]
    assert "双皮奶" in names
    assert "伦教糕" in names
    assert "顺德鱼生" in names
    assert "大良牛乳" in names
    assert "羊额烧鹅" in names
    assert "龟苓膏" in names
    assert "香云纱" not in names
    assert {row["content_type"] for row in rows} == {"local_cuisine"}
    assert rows[0]["province"] == "广东省"
    assert all("district" not in row for row in rows)


def test_parse_mct_intangible_food_route_html_ignores_non_food_route_prose():
    html = """
    <html>
      <body>
        <div>河北省丨大名非遗美食之旅</div>
        <p>行程节点</p>
        <p>五鹿香非遗工坊→北城门楼（大名草编非遗工坊）</p>
        <p>非遗美食技艺及特色项目</p>
        <p>大名小磨香油制作技艺、滴溜酒制作技艺、二毛烧鸡制作技艺、芝麻蕉烧饼制作技艺、糖烧饼制作技艺、大名草编技艺</p>
        <p>线路将小磨香油、滴溜酒、草编等各级非遗代表性项目，与大运河、特色街区等空间节点有机串联，既展示香油石磨、水代法取油等饮食类非遗的智慧。</p>
      </body>
    </html>
    """

    rows = parse_mct_intangible_food_route_html(
        html,
        source_url="https://zhuanti.mct.gov.cn/fymstslvxlzs/xl_detail/9707.html",
    )

    names = [row["name"] for row in rows]
    assert "大名小磨香油" in names
    assert "滴溜酒" in names
    assert "二毛烧鸡" in names
    assert "芝麻蕉烧饼" in names
    assert "糖烧饼" in names
    assert "大名草编" not in names
    assert "草编等各级非遗代表性项目" not in names
    assert "与大运河" not in names
    assert "特色街区等空间节点有机串联" not in names
    assert "既展示香油" not in names


def test_parse_mct_intangible_food_route_html_keeps_city_when_mentioned():
    html = """
    <html>
      <body>
        <div>陕西省丨西安市非遗美食之旅</div>
        <p>非遗美食技艺及特色项目</p>
        <p>肉夹馍制作技艺、葫芦鸡制作技艺</p>
      </body>
    </html>
    """

    rows = parse_mct_intangible_food_route_html(
        html,
        source_url="https://zhuanti.mct.gov.cn/fymstslvxlzs/xl_detail/9708.html",
    )

    assert {row["city"] for row in rows} == {"西安市"}


def test_firecrawl_cuisine_extractor_uses_structured_json_schema():
    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {
                "data": {
                    "json": {
                        "route_title": "重庆市丨寻味烟火 邂逅非遗——荣昌美食体验之旅",
                        "province": "重庆市",
                        "city": "重庆市",
                        "cuisines": [
                            {
                                "name": "荣昌卤鹅",
                                "evidence_text": "除了招牌菜荣昌卤鹅，另有鹅肉狮子头。",
                            },
                            {
                                "name": "鹅肉狮子头",
                                "evidence_text": "除了招牌菜荣昌卤鹅，另有鹅肉狮子头。",
                            },
                        ],
                    }
                }
            }

    class FakeClient:
        def __init__(self) -> None:
            self.post_calls = []

        def post(self, url: str, headers: dict, json: dict) -> FakeResponse:
            self.post_calls.append({"url": url, "headers": headers, "json": json})
            return FakeResponse()

    client = FakeClient()
    extractor = FirecrawlCuisineExtractor(api_key="firecrawl-key", client=client)

    rows = extractor.extract_rows(
        "https://zhuanti.mct.gov.cn/fymstslvxlzs/xl_detail/9697.html"
    )

    assert [row["name"] for row in rows] == ["荣昌卤鹅", "鹅肉狮子头"]
    assert {row["content_type"] for row in rows} == {"local_cuisine"}
    assert {row["city"] for row in rows} == {"重庆市"}
    assert client.post_calls[0]["url"] == "https://api.firecrawl.dev/v2/scrape"
    assert client.post_calls[0]["headers"] == {"Authorization": "Bearer firecrawl-key"}
    assert client.post_calls[0]["json"]["formats"][0]["type"] == "json"
    assert "schema" in client.post_calls[0]["json"]["formats"][0]


def test_firecrawl_cuisine_extractor_rejects_prose_city_fragment():
    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {
                "data": {
                    "json": {
                        "route_title": "吉林省丨延边风情寻味——穿梭市井烟火的非遗美食之旅",
                        "province": "吉林省",
                        "city": "穿梭市",
                        "cuisines": [{"name": "延边朝鲜族冷面"}],
                    }
                }
            }

    class FakeClient:
        def post(self, url: str, headers: dict, json: dict) -> FakeResponse:
            return FakeResponse()

    extractor = FirecrawlCuisineExtractor(api_key="firecrawl-key", client=FakeClient())

    rows = extractor.extract_rows(
        "https://zhuanti.mct.gov.cn/fymstslvxlzs/xl_detail/9678.html"
    )

    assert rows[0]["city"] is None


def test_merge_rows_by_name_province_source_keeps_existing_rows():
    existing = [
        {"name": "北京鸭", "province": "北京市", "source_name": "source-a", "text": "old"}
    ]
    incoming = [
        {"name": "北京鸭", "province": "北京市", "source_name": "source-a", "text": "new"},
        {"name": "南宫黄韭", "province": "河北省", "source_name": "source-a", "text": "new"},
    ]

    merged = merge_rows_by_name_province_source(existing, incoming)

    assert len(merged) == 2
    assert merged[0]["text"] == "old"
    assert merged[1]["name"] == "南宫黄韭"
