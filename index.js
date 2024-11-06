const express = require("express");
const app = express();
const PORT = 3000;

//들어오는 값은 과목이름, 과목 코드 둘 다 되도록 설정해놨음(json) 주소는 http://localhost:3000/getTimetables 
/*
요청 형식은
{
    {
    "subjects": [
        "컴퓨터공학창의설계",
        "컴퓨터네트워크",
        "자료구조(1)",
        "컴퓨터공학캡스톤디자인(2)",
        "알고리즘"
    ]
}
    아니면 {
    "subjects": [1, 3, 5, 7, 10]
}
}
*/


// timetableData 가져오기 이름은 timetableData.js
const timetableData = require("./timetableData");

app.use(express.json());

// 시간표가 겹치는지 확인하는 함수
//아래 시간표를 짜눈 함수 내부에서 시간표가 겹치는 지 확인하는 함수, 안겹치면 false로 
//코드 볼거면 3번째 함수부터 보는 게 편함
function isOverlap(times1, times2) { 
    for (const time1 of times1) {
        for (const time2 of times2) {
            if (
                time1.day === time2.day &&
                !(time1.endTime <= time2.startTime || time1.startTime >= time2.endTime)
            ) {
                return true;
            }
        }
    }
    return false;
}

// 전공 필수 과목의 모든 가능한 조합을 생성하는 함수.
function getMajorCombinations(majorSubjects) {
    const combinations = [];

    function helper(selected, index) {
        if (index === majorSubjects.length) {
            combinations.push([...selected]);
            return;
        }

        const current = majorSubjects[index];
        let canAdd = true;

        for (const subject of selected) {
            if (isOverlap(timetableData[current].times, timetableData[subject].times)) {
                canAdd = false;
                break;
            }
        }

        if (canAdd) {
            selected.push(current);
            helper(selected, index + 1);
            selected.pop();
        }

        helper(selected, index + 1);
    }
    helper([], 0);
    return combinations.filter((combo) => combo.length > 0);
}

// 최종 함수
function generateTimetables(subjects) {
    // subjects가 문자열(과목 이름) 배열인지 숫자(과목 코드) 배열인지 확인
    const subjectCodes = typeof subjects[0] === "string" 
        ? Object.keys(timetableData)
            .filter(code => subjects.includes(timetableData[code].name))
            .map(Number)
        : subjects;
        //과목코드를 배열에 사용함, 인풋값이 과목 이름이면 코드로 변환하고 아니면 그냥 사용

    const majorSubjects = subjectCodes.filter(code => timetableData[code].weight === 3);  // 전공 필수만 선택
    const otherSubjects = subjectCodes.filter(code => timetableData[code].weight < 3);     // 나머지 과목들 선택

    const majorCombinations = getMajorCombinations(majorSubjects);  // 전공 필수 조합 생성
    const timetables = [];

    // 각 major 조합에 대해 겹치지 않는 나머지 과목을 추가하여 시간표 완성
    for (const majors of majorCombinations) {
        let selectedSubjects = [...majors];

        const sortedOthers = otherSubjects.sort((a, b) => timetableData[b].weight - timetableData[a].weight);

        for (const code of sortedOthers) {
            const times = timetableData[code].times;
            let overlap = false;

            for (const selected of selectedSubjects) {
                if (isOverlap(timetableData[selected].times, times)) {
                    overlap = true;
                    break;
                }
            }

            if (!overlap) {
                selectedSubjects.push(code);
            }
        }

        timetables.push(selectedSubjects);
    }

    // 최종 timetables 배열이 넘 많으면 3개로 줄임, 처음, 중간, 마지막
    if (timetables.length > 3) {
        const middleIndex = Math.floor(timetables.length / 2);
        return [timetables[0], timetables[middleIndex], timetables[timetables.length - 1]];
    }

    return timetables;
}



//그냥 테스트로 콘솔에 보이도록 만든 겁니다. timetables에 배열로 과목 번호가 들어갑니다 [[1,2,3,4], [2,3,4,5]] 이런 식으로
//과목이름으로 넣을까 했는데 어차피 시간정보 끌고와야되는 맵핑이 필요하고 같은 과목명에 다른 교수님 들어갈 수도 있어서 코드로 했음.
function printTimetables(timetables) {
    if (timetables.length === 0) {
        console.log("가능한 시간표 조합이 없습니다.");
        return;
    }

    timetables.forEach((timetable, index) => {
        console.log(`\n옵션 ${index + 1}:`);
        timetable.forEach((code) => {
            const subject = timetableData[code];
            const timesFormatted = subject.times
                .map(time => `${time.day} ${time.startTime} - ${time.endTime}`)
                .join(", "); //배열안에 정보는 과목코드기 때문에 맵핑으로 이름과 시간을 가져와야 됨.
            console.log(`${subject.name} : ${timesFormatted}`);
        });
    });
}

// POST 엔드포인트 정의
app.post("/getTimetables", (req, res) => {
    const { subjects } = req.body;

    if (!Array.isArray(subjects)) { // 형식이 잘못됐을 때
        console.error("subjects는 과목 배열이어야 합니다.");
        return res.status(400).send("subjects는 과목 배열이어야 합니다.");
    }

    const timetables = generateTimetables(subjects); // subjects를 직접 사용
    printTimetables(timetables); // 콘솔에 시간표 출력

    res.sendStatus(200); // 응답 상태만 반환
});


// 서버 시작
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
