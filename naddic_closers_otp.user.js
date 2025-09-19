// ==UserScript==
// @name         Naddic Closers OTP
// @namespace    https://www.naddic.co.kr
// @version      2025-09-19v2
// @description  클로저스 공식 홈페이지 (나딕게임즈) OTP 자동 입력
// @author       Korokk3
// @match        https://www.naddic.co.kr/ko/web/member/login*
// @match        https://www.naddic.co.kr/ko/service/otp*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=naddic.co.kr
// @grant        GM.setValue
// @grant        GM.getValue
// @require      https://raw.githubusercontent.com/jiangts/JS-OTP/refs/heads/master/js/sha_dev.js
// @require      https://raw.githubusercontent.com/jiangts/JS-OTP/refs/heads/master/js/jsOTP.js
// ==/UserScript==

(async function() {
    'use strict';

    console.log("Naddic OTP 자동입력 스크립트가 실행되었습니다.");

    const custom_alert = window.showCustomAlert || alert;
    const vars = {
        otp: new jsOTP.totp(30, 6), // OTP 값은 30초마다 갱신, 6자리의 코드
        get key() { return this.user_id.then(user_id => { Promise.resolve(GM.getValue(`OTP_PASS_KEY_${user_id}`, null)) }); },
		set key(v) { return this.user_id.then(user_id => { Promise.resolve(GM.setValue(`OTP_PASS_KEY_${user_id}`, v)) }); },
        get user_id() { return Promise.resolve( GM.getValue("OTP_PASS_LAST_ID", null) ); },
        set user_id(v) { return Promise.resolve( GM.setValue("OTP_PASS_LAST_ID", v) ); },
    }

    // OTP 값 저장
    async function set_otp(key) {
        if (location.hash != "#step-2") return; // step-1과 step-2에서 나오는 키 값이 각각 다른데 step-2에서 나오는게 실제 값
        if (!key) return; // OTP 키 값이 없는 경우 패스
        while (1) {
            let id = await vars.user_id
            console.log(id);

            if (!id || id.length < 7) {
                let user_id = prompt("아이디를 찾을 수 없습니다.\n현재 로그인 중인 나딕게임즈ID (이메일)을 입력해주세요.");
                if (user_id) await (vars.user_id = user_id);
            } else break;
        }

        await (vars.key = key);
        custom_alert(`현재 로그인 중인 계정의 OTP 인증 키가 ${key}(으)로 설정되었습니다.`);
    }

    // DOM 감시
    const observer = new MutationObserver(function(ml, ob) {
        vars.key.then(key => {
            for (const m of ml){
                // 로그인 OTP 값 자동 입력 및 로그인 버튼 자동 클릭
                if (m.target.id === "otpWrap") {
                    if (m.attributeName === "style" && m.target.style.display !== "none" && key) {
                        let v = vars.otp.getOtp(key, new Date().getTime());
                        document.getElementById("validCode").value = v;
                        submitOtpValidation();
                    }
                }
                // OTP 값 재확인 자동 입력
                else if (m.target.id === "step-3") {
                    if (m.attributeName === "style" && m.target.style.display === "block" && key) {
                        let v = vars.otp.getOtp(key, new Date().getTime());
                        document.getElementById("validCode").value = v;
                        document.getElementById("validCode").type = "";
                    }
                }
                // OTP 생성시 키 값 확인 및 저장
                else {
                    if (m.type === "characterData" && m.target.textContent) {
                        console.info("OTP 코드를 발견했습니다. (Case 1)")
                        set_otp(m.target.textContent);
                    } else if (m.type == "childList" && m.target.innerText) {
                        console.info("OTP 코드를 발견했습니다. (Case 2)")
                        set_otp(m.target.textContent);
                    }
                }
            }
        });
    });

    // 마지막으로 로그인할 때 사용한 아이디 기록
    if (document.getElementById("Login")) {
        document.getElementById("Login").addEventListener("submit", async (e) => {
            await (vars.user_id = document.querySelector("[name='userID']").value);
        });
    }

    // validCode 자동 채우기
    if (document.getElementById("validCode") && await vars.key) {
        let v = vars.otp.getOtp(await vars.key, new Date().getTime());
        document.getElementById("validCode").value = v;
        document.getElementById("validCode").type = "";
    }

    // 자동으로 채워진 validCode의 값을 필요시 추가로 업데이트 (최신화)
    // otpWrap (로그인창 OTP 입력) 객체가 발견되면 속성값 변화 감시
    if (document.getElementById("otpWrap"))
        observer.observe(document.getElementById("otpWrap"), { attributes: true});

    // step-3 (OTP 설정시 확인 입력) 객체가 발견되면 속성값 변화 감시
    if (document.getElementById("step-3"))
        observer.observe(document.getElementById("step-3"), { attributes: true});

    // secKey (OTP 설정창 키 정보) 객체가 발견되면 속성 및 자녀 속성 변화 감시
    if (document.getElementsByClassName("secKey").length > 0) {
        observer.observe(document.getElementsByClassName("secKey")[0].children[0], {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
        });
    }
})();
