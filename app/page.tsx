// "/" 에서 /form 으로 페이지를 새로 불러오면 document.referrer 가 우리 사이트로 바뀌어
// 네이버카페(/mamcafe/{id} 추적 링크 포함) 유입을 잡지 못한다. 그래서 이동하지 않고 같은 폼을 그대로 보여준다.
export { default } from "./form/page";
